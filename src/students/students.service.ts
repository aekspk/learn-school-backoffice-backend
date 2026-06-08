import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/services/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.student.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: number) {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) throw new NotFoundException('Student not found');
    return student;
  }

  create(dto: CreateStudentDto) {
    return this.prisma.student.create({ data: dto });
  }

  async update(id: number, dto: UpdateStudentDto) {
    await this.findOne(id);
    return this.prisma.student.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.$transaction(async (tx) => {
      await tx.compensation.deleteMany({
        where: { booking: { studentId: id } },
      });
      await tx.creditTransaction.deleteMany({
        where: { package: { studentId: id } },
      });
      await tx.booking.deleteMany({ where: { studentId: id } });
      await tx.creditPackage.deleteMany({ where: { studentId: id } });
      await tx.student.delete({ where: { id } });
    });
  }

  findPackages(studentId: number) {
    return this.prisma.creditPackage.findMany({
      where: { studentId },
      include: {
        course: {
          include: { classSessions: { include: { courseLesson: true } } },
        },
      },
      orderBy: { expiresAt: 'asc' },
    });
  }

  findBookings(studentId: number) {
    return this.prisma.booking.findMany({
      where: { studentId },
      include: { classSession: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
