import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  CompensationType,
  PackageStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from 'src/core/services/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';

const TERMINAL_STATUSES: BookingStatus[] = [
  BookingStatus.ATTENDED,
  BookingStatus.SKIPPED,
  BookingStatus.ABSENT,
  BookingStatus.CANCELLED,
];

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(classSessionId?: number, studentId?: number) {
    return this.prisma.booking.findMany({
      where: {
        ...(classSessionId && { classSessionId }),
        ...(studentId && { studentId }),
      },
      include: { student: true, classSession: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        student: true,
        classSession: true,
        package: true,
        compensation: true,
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async createBooking(dto: CreateBookingDto) {
    return this.prisma.$transaction(async (tx) => {
      // EC#1 — pessimistic lock on the session row to prevent concurrent overbooking
      await tx.$queryRaw`SELECT id FROM "ClassSession" WHERE id = ${dto.classSessionId} FOR UPDATE`;

      const session = await tx.classSession.findUnique({
        where: { id: dto.classSessionId },
      });
      if (!session) throw new NotFoundException('Class session not found');
      if (session.bookedSeats >= session.totalSeats) {
        throw new BadRequestException('Class session is fully booked');
      }

      // EC#4 — validate package is active, unexpired, and has credits
      // EC#5 — course-specific package must match this session's course
      const pkg = await tx.creditPackage.findUnique({
        where: { id: dto.packageId },
      });
      if (!pkg) throw new NotFoundException('Credit package not found');
      if (pkg.studentId !== dto.studentId) {
        throw new ForbiddenException('Package does not belong to this student');
      }
      if (pkg.status !== PackageStatus.ACTIVE) {
        throw new BadRequestException('Credit package is not active');
      }
      if (pkg.expiresAt <= new Date()) {
        throw new BadRequestException('Credit package has expired');
      }
      if (pkg.remainingCredits < 1) {
        throw new BadRequestException(
          'Credit package has no remaining credits',
        );
      }
      if (pkg.courseId !== session.courseId) {
        throw new BadRequestException(
          'Credit package is not valid for this course',
        );
      }

      // EC#9 — reject if student already has an overlapping BOOKED session
      const newStart = session.scheduledAt;
      const newEnd = new Date(
        newStart.getTime() + session.durationMin * 60_000,
      );
      const overlapping = await tx.$queryRaw<{ id: number }[]>`
        SELECT b.id FROM "Booking" b
        JOIN "ClassSession" cs ON b."classSessionId" = cs.id
        WHERE b."studentId"      = ${dto.studentId}
          AND b.status::text     = 'BOOKED'
          AND cs."scheduledAt"   < ${newEnd}
          AND (cs."scheduledAt" + cs."durationMin" * INTERVAL '1 minute') > ${newStart}
          AND b."classSessionId" <> ${dto.classSessionId}
      `;
      if (overlapping.length > 0) {
        throw new ConflictException(
          'Student already has an overlapping booking',
        );
      }

      try {
        await tx.classSession.update({
          where: { id: dto.classSessionId },
          data: { bookedSeats: { increment: 1 } },
        });

        return await tx.booking.create({
          data: {
            studentId: dto.studentId,
            classSessionId: dto.classSessionId,
            packageId: dto.packageId,
          },
        });
      } catch (err) {
        // EC#6 — unique constraint on [studentId, classSessionId]
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          throw new ConflictException(
            'Student is already booked into this session',
          );
        }
        throw err;
      }
    });
  }

  async markAttendance(
    bookingId: number,
    dto: MarkAttendanceDto,
    markedById: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
      });
      if (!booking) throw new NotFoundException('Booking not found');

      // EC#3 — terminal states are immutable
      if (TERMINAL_STATUSES.includes(booking.status)) {
        throw new BadRequestException(
          `Cannot update a booking already in terminal status: ${booking.status}`,
        );
      }

      const { status } = dto;

      if (
        status === BookingStatus.ATTENDED ||
        status === BookingStatus.ABSENT
      ) {
        // EC#2 — pessimistic lock on package to prevent simultaneous credit deduction
        await tx.$queryRaw`SELECT id FROM "CreditPackage" WHERE id = ${booking.packageId} FOR UPDATE`;

        const pkg = await tx.creditPackage.findUnique({
          where: { id: booking.packageId },
        });
        if (!pkg || pkg.remainingCredits < 1) {
          throw new BadRequestException('Insufficient credits in the package');
        }

        const newRemaining = pkg.remainingCredits - 1;
        await tx.creditPackage.update({
          where: { id: booking.packageId },
          data: {
            remainingCredits: newRemaining,
            ...(newRemaining === 0 && { status: PackageStatus.DEPLETED }),
          },
        });

        await tx.creditTransaction.create({
          data: {
            packageId: booking.packageId,
            bookingId: booking.id,
            delta: -1,
            reason:
              status === BookingStatus.ATTENDED
                ? 'Class attended'
                : 'Absent from class',
          },
        });
      }

      // EC#7 — compensation is created atomically on SKIPPED
      if (status === BookingStatus.SKIPPED) {
        await tx.compensation.create({
          data: {
            bookingId: booking.id,
            type: CompensationType.SEAT_CREDIT,
          },
        });
      }

      // Release the reserved seat on CANCELLED
      if (status === BookingStatus.CANCELLED) {
        await tx.classSession.update({
          where: { id: booking.classSessionId },
          data: { bookedSeats: { decrement: 1 } },
        });
      }

      return tx.booking.update({
        where: { id: bookingId },
        data: { status, markedById, markedAt: new Date() },
      });
    });
  }

  async cancelBooking(bookingId: number) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id: bookingId } });
      if (!booking) throw new NotFoundException('Booking not found');

      if (TERMINAL_STATUSES.includes(booking.status)) {
        throw new BadRequestException(
          `Cannot cancel a booking in terminal status: ${booking.status}`,
        );
      }

      await tx.classSession.update({
        where: { id: booking.classSessionId },
        data: { bookedSeats: { decrement: 1 } },
      });

      return tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.CANCELLED },
      });
    });
  }
}
