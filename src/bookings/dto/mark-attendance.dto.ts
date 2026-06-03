import { IsIn } from 'class-validator';
import { BookingStatus } from '@prisma/client';

const ALLOWED_STATUSES = [
  BookingStatus.ATTENDED,
  BookingStatus.SKIPPED,
  BookingStatus.ABSENT,
  BookingStatus.CANCELLED,
] as const;

export class MarkAttendanceDto {
  @IsIn(ALLOWED_STATUSES)
  status: BookingStatus;
}
