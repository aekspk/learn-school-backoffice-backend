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

  constructor(user: Partial<User>) {
    Object.assign(this, user);
  }
}
