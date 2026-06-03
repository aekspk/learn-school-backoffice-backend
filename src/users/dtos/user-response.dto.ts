import { Role, User } from '@prisma/client';
import { Expose, Type } from 'class-transformer';
import { UserAddressDto } from './user-address.dto';

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
  @Type(() => UserAddressDto)
  address: UserAddressDto;

  constructor(user: Partial<User>) {
    Object.assign(this, user);
  }
}
