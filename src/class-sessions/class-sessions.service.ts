import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/core/services/prisma.service';
import { CreateClassSessionDto } from './dto/create-class-session.dto';
import { UpdateClassSessionDto } from './dto/update-class-session.dto';
import { BookingStatus } from '@prisma/client';

@Injectable()
export class ClassSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(branchId?: number) {
    return this.prisma.classSession.findMany({
      where: branchId ? { branchId } : undefined,
      include: {
        course: true,
        branch: true,
        courseLesson: true,
        bookings: true,
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async findEligibleStudents(id: number) {
    const session = await this.findOne(id);

    return this.prisma.student.findMany({
      where: {
        // must have at least one active, unexpired package with credits for this course
        creditPackages: {
          some: {
            expiresAt: { gt: new Date() },
            remainingCredits: { gte: 1 },
            courseId: session.courseId,
          },
        },
        // must not already be booked into any session covering the same lesson
        bookings: {
          none: session.courseLessonId
            ? {
                classSession: { courseLessonId: session.courseLessonId },
                status: { not: BookingStatus.SKIPPED },
              }
            : { classSessionId: id },
        },
      },
    });
  }

  async findOne(id: number) {
    const session = await this.prisma.classSession.findUnique({
      where: { id },
      include: {
        course: true,
        branch: true,
        courseLesson: true,
        bookings: { include: { student: true } },
      },
    });
    if (!session) throw new NotFoundException('Class session not found');
    return session;
  }

  create(branchId: number, dto: CreateClassSessionDto) {
    return this.prisma.classSession.create({ data: { ...dto, branchId } });
  }

  async update(id: number, dto: UpdateClassSessionDto) {
    const session = await this.findOne(id);

    if (dto.totalSeats !== undefined && dto.totalSeats < session.bookedSeats) {
      throw new BadRequestException(
        'Cannot reduce totalSeats below current bookedSeats',
      );
    }

    return this.prisma.classSession.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.classSession.delete({ where: { id } });
  }
}
