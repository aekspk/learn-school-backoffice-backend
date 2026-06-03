import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { UserAddressDto } from './user-address.dto';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsString()
  @IsOptional()
  image?: string;

  @IsObject()
  @IsOptional()
  @Type(() => UserAddressDto)
  address?: UserAddressDto;
}
