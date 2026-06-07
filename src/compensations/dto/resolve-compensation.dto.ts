import { CompensationStatus, CompensationType } from '@prisma/client';
import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';

const ALLOWED_STATUSES = [
  CompensationStatus.RESOLVED,
  CompensationStatus.REJECTED,
] as const;

export class ResolveCompensationDto {
  @IsIn(ALLOWED_STATUSES)
  status: CompensationStatus;

  @IsEnum(CompensationType)
  @IsOptional()
  type?: CompensationType;

  @IsString()
  @IsOptional()
  note?: string;
}
