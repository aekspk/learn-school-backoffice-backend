import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CompensationStatus } from '@prisma/client';
import { PrismaService } from 'src/core/services/prisma.service';
import { CreateCompensationDto } from './dto/create-compensation.dto';
import { ResolveCompensationDto } from './dto/resolve-compensation.dto';

@Injectable()
export class CompensationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(branchId: number, status?: CompensationStatus) {
    const compensations = await this.prisma.compensation.findMany({
      where: {
        status,
        booking: branchId ? { classSession: { branchId } } : undefined,
      },
      include: { booking: { include: { student: true, classSession: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const pendingCount = compensations.filter(
      (c) => c.status === CompensationStatus.PENDING,
    ).length;

    const resolveCount = compensations.filter(
      (c) => c.status === CompensationStatus.RESOLVED,
    ).length;

    const rejectCount = compensations.filter(
      (c) => c.status === CompensationStatus.REJECTED,
    ).length;

    const res = {
      statusStats: {
        pending: pendingCount,
        resolve: resolveCount,
        rejectCount: rejectCount,
      },
      compensations,
    };

    return res;
  }

  async findOne(id: number) {
    const comp = await this.prisma.compensation.findUnique({
      where: { id },
      include: { booking: { include: { student: true, classSession: true } } },
    });
    if (!comp) throw new NotFoundException('Compensation not found');
    return comp;
  }

  create(dto: CreateCompensationDto) {
    return this.prisma.compensation.create({ data: dto });
  }

  async resolve(id: number, dto: ResolveCompensationDto, resolvedById: number) {
    const comp = await this.findOne(id);

    // EC#8 — guard against overwriting a terminal record
    if (
      comp.status === CompensationStatus.RESOLVED ||
      comp.status === CompensationStatus.REJECTED
    ) {
      throw new BadRequestException(
        `Compensation is already ${comp.status.toLowerCase()}`,
      );
    }

    return this.prisma.compensation.update({
      where: { id },
      data: {
        status: dto.status,
        type: dto.type,
        note: dto.note,
        resolvedById,
        resolvedAt: new Date(),
      },
    });
  }
}
