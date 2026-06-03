import { AuthGuard } from '@nestjs/passport';

export class AccessTokenAuthGuard extends AuthGuard('access-token') {}
