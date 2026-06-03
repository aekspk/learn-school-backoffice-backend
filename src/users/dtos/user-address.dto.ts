import { Expose } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

export class UserAddressDto {
  @Expose()
  @IsString()
  houseNumber: string;

  @Expose()
  @IsString()
  @IsOptional()
  village?: string;

  @Expose()
  @IsString()
  road: string;

  @Expose()
  @IsString()
  district: string;

  @Expose()
  @IsString()
  province: string;

  @Expose()
  @IsString()
  postalCode: string;
}
