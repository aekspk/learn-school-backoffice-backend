import type { User } from '@prisma/client';
import { Expose, Type } from 'class-transformer';
import { UserResponseDto } from 'src/users/dtos/user-response.dto';

export class ProfileWithTokenDto {
  @Expose()
  @Type(() => UserResponseDto)
  profile: User;

  @Expose()
  accessToken: string;

  @Expose()
  refreshToken: string;

  @Expose()
  expiresIn: number;

  constructor(profileWithTokens: Partial<ProfileWithTokenDto>) {
    Object.assign(this, profileWithTokens);
  }
}
