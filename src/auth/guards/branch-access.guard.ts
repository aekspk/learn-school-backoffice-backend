import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { AccessTokenPayload } from '../models/access-token-payload.model';

/**
 * Ensures branch-scoped staff can only access resources belonging to their own branch.
 * Reads branchId from route params → body → query (first defined wins).
 * HQ_ADMIN bypasses the check entirely (Edge Case #10).
 */
@Injectable()
export class BranchAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user as AccessTokenPayload;

    if (!user) {
      throw new UnauthorizedException(
        'Authentication required for BranchAccessGuard',
      );
    }

    if (user.role === Role.HQ_ADMIN) return true;

    const rawBranchId =
      (req.params as Record<string, string>)['branchId'] ??
      (req.body as Record<string, unknown>)?.['branchId'] ??
      (req.query as Record<string, string>)['branchId'];

    if (rawBranchId === undefined || rawBranchId === null) return true;

    if (Number(rawBranchId) !== user.branchId) {
      throw new ForbiddenException('Access to this branch is not permitted');
    }

    return true;
  }
}
