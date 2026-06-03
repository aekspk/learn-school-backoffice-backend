import { Injectable, NotFoundException } from '@nestjs/common';
import { PackageStatus } from '@prisma/client';
import { PrismaService } from 'src/core/services/prisma.service';
import { CreateCreditPackageDto } from './dto/create-credit-package.dto';
import { UpdateCreditPackageDto } from './dto/update-credit-package.dto';

@Injectable()
export class CreditPackagesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(studentId?: number) {
    return this.prisma.creditPackage.findMany({
      where: studentId ? { studentId } : undefined,
      orderBy: { expiresAt: 'asc' },
    });
  }

  async findOne(id: number) {
    const pkg = await this.prisma.creditPackage.findUnique({ where: { id } });
    if (!pkg) throw new NotFoundException('Credit package not found');
    return pkg;
  }

  create(dto: CreateCreditPackageDto) {
    return this.prisma.creditPackage.create({
      data: {
        ...dto,
        remainingCredits: dto.totalCredits,
        status: PackageStatus.ACTIVE,
      },
    });
  }

  async update(id: number, dto: UpdateCreditPackageDto) {
    await this.findOne(id);
    return this.prisma.creditPackage.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.creditPackage.delete({ where: { id } });
  }
}
