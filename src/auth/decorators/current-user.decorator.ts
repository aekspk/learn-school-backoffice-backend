import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const CurrentUser = createParamDecorator(
  (_data: string, context: ExecutionContext) => {
    return context.switchToHttp().getRequest<Request>().user;
  },
);
