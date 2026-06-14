import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';
import { PrismaService } from 'src/core/services/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { MarkAttendancesDto } from './dto/mark-attendances.dto ';

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
      const pkg = await tx.creditPackage.findFirst({
        where: { studentId: dto.studentId, courseId: session.courseId },
      });
      if (!pkg) throw new NotFoundException('Credit package not found');
      if (pkg.studentId !== dto.studentId) {
        throw new ForbiddenException('Package does not belong to this student');
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

      try {
        await tx.classSession.update({
          where: { id: dto.classSessionId },
          data: { bookedSeats: { increment: 1 } },
        });

        return await tx.booking.create({
          data: {
            studentId: dto.studentId,
            classSessionId: dto.classSessionId,
            packageId: pkg.id,
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
    return this.prisma.$transaction((tx) =>
      this.markAttendanceInTx(tx, bookingId, dto.status, markedById),
    );
  }

  async markAttendances(dtos: MarkAttendancesDto[], markedById: number) {
    return this.prisma.$transaction(async (tx) => {
      const results: Awaited<ReturnType<typeof this.markAttendanceInTx>>[] = [];
      for (const dto of dtos) {
        results.push(
          await this.markAttendanceInTx(
            tx,
            dto.bookingId,
            dto.status,
            markedById,
          ),
        );
      }
      return results;
    });
  }

  private async markAttendanceInTx(
    tx: Prisma.TransactionClient,
    bookingId: number,
    status: BookingStatus,
    markedById: number,
  ) {
    const TERMINAL_STATUSES: BookingStatus[] = [
      BookingStatus.ATTENDED,
      BookingStatus.SKIPPED,
      BookingStatus.ABSENT,
    ];

    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');

    // EC#3 — terminal states are immutable
    if (TERMINAL_STATUSES.includes(booking.status)) {
      throw new BadRequestException(
        `Cannot update a booking already in terminal status: ${booking.status}`,
      );
    }

    if (status === BookingStatus.ATTENDED || status === BookingStatus.ABSENT) {
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
        data: { remainingCredits: newRemaining },
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
        data: { bookingId: booking.id },
      });
    }

    return tx.booking.update({
      where: { id: bookingId },
      data: { status, markedById, markedAt: new Date() },
    });
  }
}
