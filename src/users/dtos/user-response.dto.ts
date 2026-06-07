import { Role, User } from '@prisma/client';
import { Expose } from 'class-transformer';

export class UserResponseDto {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose()
  email: string;

  @Expose()
  image: string;

  @Expose()
  role: Role;

  @Expose()
  branchId: number;

  @Expose()
  branchName: string;

  constructor(user: Partial<User> & { branch?: { name: string } | null }) {
    Object.assign(this, user);
    this.branchName = user.branch?.name ?? 'HQ';
  }
}
