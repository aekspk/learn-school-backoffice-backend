import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
      include: { course: true },
    });
  }

  async findOne(id: number) {
    const pkg = await this.prisma.creditPackage.findUnique({ where: { id } });
    if (!pkg) throw new NotFoundException('Credit package not found');
    return pkg;
  }

  async create(dto: CreateCreditPackageDto) {
    const existingPkg = await this.prisma.creditPackage.findFirst({
      where: { courseId: dto.courseId, studentId: dto.studentId },
      select: { id: true },
    });

    if (existingPkg)
      throw new ConflictException('Credit package already exists');

    return await this.prisma.creditPackage.create({
      data: {
        ...dto,
        remainingCredits: dto.totalCredits,
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
