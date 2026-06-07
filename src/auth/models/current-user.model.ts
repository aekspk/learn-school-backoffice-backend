import { Role } from '@prisma/client';

export interface AuthUser {
  id: number;
  role: Role;
  branchId: number | null;
  branchName: string;
}
