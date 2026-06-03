import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { UsersService } from 'src/users/users.service';
import type { StringValue } from 'ms';
import ms from 'ms';
import * as bcrypt from 'bcrypt';
import { omit } from 'lodash';
import { UpdateUserDto } from 'src/users/dtos/update-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private jwtService: JwtService,
  ) {}

  async generateProfileWithTokens(user: User) {
    const refreshTokenExpireIn = process.env
      .REFRESH_TOKEN_EXPIRE_IN as StringValue;
    const accessTokenExpireIn = process.env
      .ACCESS_TOKEN_EXPIRE_IN as StringValue;

    const refreshToken = this.jwtService.sign(
      {},
      {
        secret: process.env.REFRESH_TOKEN_SECRET_KEY,
        expiresIn: refreshTokenExpireIn,
      },
    );
    const accessToken = this.jwtService.sign(
      { sub: user.id, role: user.role, branchId: user.branchId ?? null },
      {
        secret: process.env.ACCESS_TOKEN_SECRET_KEY,
        expiresIn: accessTokenExpireIn,
      },
    );

    await this.userService.updateRefreshToken(user.id, refreshToken);

    return {
      profile: user,
      accessToken,
      refreshToken,
      expiresIn: +new Date() + ms(accessTokenExpireIn),
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.userService.findByEmail(email);

    if (!user) return null;

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    return isPasswordMatch ? omit(user, 'password') : null;
  }

  getProfile(userId: number) {
    return this.userService.findById(userId);
  }

  updateProfile(userId: number, form: UpdateUserDto) {
    return this.userService.updateUser(userId, form);
  }

  logout(userId: number) {
    return this.userService.updateRefreshToken(userId, null);
  }
}
