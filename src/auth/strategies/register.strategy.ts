import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { CreateUserDto } from 'src/users/dtos/create-user.dto';
import { UsersService } from 'src/users/users.service';
import { Request } from 'express';

@Injectable()
export class RegisterStrategy extends PassportStrategy(Strategy, 'register') {
  constructor(private readonly userService: UsersService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true,
    });
  }

  async validate(req: Request<object, object, CreateUserDto>) {
    return await this.userService.createUser(req.body);
  }
}
