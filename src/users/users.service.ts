import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/core/services/prisma.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { join } from 'path';
import { rm } from 'fs/promises';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { branch: { select: { name: true } } },
    });
    if (!user) throw new NotFoundException();
    return user;
  }

  findByRefreshToken(refreshToken: string) {
    return this.prisma.user.findUnique({ where: { refreshToken } });
  }

  async createUser(form: CreateUserDto) {
    const { password, ...rest } = form;
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await this.prisma.user.create({
      data: {
        ...rest,
        password: passwordHash,
      },
    });

    return user;
  }

  async updateUser(userId: number, form: UpdateUserDto) {
    const existingUser = await this.findById(userId);
    const { password, ...rest } = form;

    if (existingUser?.image) {
      await rm(join(__dirname, '../../uploads/users', existingUser.image), {
        force: true,
      });
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...rest,
        password: password ? await bcrypt.hash(password, 12) : undefined,
      },
    });
  }

  updateRefreshToken(id: number, newToken: string | null) {
    return this.prisma.user.update({
      where: { id },
      data: {
        refreshToken: newToken,
      },
    });
  }
}
