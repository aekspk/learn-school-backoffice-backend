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

  findAll(status?: CompensationStatus) {
    return this.prisma.compensation.findMany({
      where: status ? { status } : undefined,
      include: { booking: { include: { student: true, classSession: true } } },
      orderBy: { createdAt: 'desc' },
    });
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

    // EC#8 — guard against overwriting a resolved record
    if (comp.status === CompensationStatus.RESOLVED) {
      throw new BadRequestException('Compensation is already resolved');
    }

    return this.prisma.compensation.update({
      where: { id },
      data: {
        status: dto.status,
        note: dto.note,
        resolvedById,
        resolvedAt: new Date(),
      },
    });
  }
}
