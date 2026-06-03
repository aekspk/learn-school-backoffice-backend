import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from 'src/users/users.service';
import { Request } from 'express';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'refresh-token',
) {
  constructor(private readonly userService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      secretOrKey: process.env.REFRESH_TOKEN_SECRET_KEY,
      passReqToCallback: true,
    });
  }

  async validate(req: Request<object, object, { refreshToken: string }>) {
    const refreshToken = req.body.refreshToken;
    const user = await this.userService.findByRefreshToken(refreshToken);

    if (!user) throw new UnauthorizedException();
    return user;
  }
}
