import { Role } from '@prisma/client';

export interface AccessTokenPayload {
  sub: number;
  role: Role;
  branchId: number | null;
}
