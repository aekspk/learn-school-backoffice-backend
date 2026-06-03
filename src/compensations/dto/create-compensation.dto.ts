import { CompensationType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateCompensationDto {
  @IsInt()
  @IsPositive()
  bookingId: number;

  @IsEnum(CompensationType)
  type: CompensationType;

  @IsString()
  @IsOptional()
  note?: string;
}
