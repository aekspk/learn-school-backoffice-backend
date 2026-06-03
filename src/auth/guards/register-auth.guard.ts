import { AuthGuard } from '@nestjs/passport';

export class RegisterAuthGuard extends AuthGuard('register') {}
