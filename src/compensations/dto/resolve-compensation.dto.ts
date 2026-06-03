import { CompensationStatus } from '@prisma/client';
import { IsIn, IsOptional, IsString } from 'class-validator';

const ALLOWED_STATUSES = [
  CompensationStatus.RESOLVED,
  CompensationStatus.REJECTED,
] as const;

export class ResolveCompensationDto {
  @IsIn(ALLOWED_STATUSES)
  status: CompensationStatus;

  @IsString()
  @IsOptional()
  note?: string;
}
