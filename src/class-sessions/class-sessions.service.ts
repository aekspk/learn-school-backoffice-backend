import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/core/services/prisma.service';
import { CreateClassSessionDto } from './dto/create-class-session.dto';
import { UpdateClassSessionDto } from './dto/update-class-session.dto';

@Injectable()
export class ClassSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(branchId?: number) {
    return this.prisma.classSession.findMany({
      where: branchId ? { branchId } : undefined,
      include: { course: true, branch: true },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async findOne(id: number) {
    const session = await this.prisma.classSession.findUnique({
      where: { id },
      include: { course: true, branch: true },
    });
    if (!session) throw new NotFoundException('Class session not found');
    return session;
  }

  create(dto: CreateClassSessionDto) {
    return this.prisma.classSession.create({ data: dto });
  }

  async update(id: number, dto: UpdateClassSessionDto) {
    const session = await this.findOne(id);

    if (
      dto.totalSeats !== undefined &&
      dto.totalSeats < session.bookedSeats
    ) {
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
