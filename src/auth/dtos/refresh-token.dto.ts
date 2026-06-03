import { IsNotEmpty, IsString } from 'class-validator';

export class refreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
