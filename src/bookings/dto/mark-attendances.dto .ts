import { IsIn, IsNumber } from 'class-validator';
import { BookingStatus } from '@prisma/client';

const ALLOWED_STATUSES = [
  BookingStatus.ATTENDED,
  BookingStatus.SKIPPED,
  BookingStatus.ABSENT,
] as const;

export class MarkAttendancesDto {
  @IsNumber()
  bookingId: number;

  @IsIn(ALLOWED_STATUSES)
  status: BookingStatus;
}
