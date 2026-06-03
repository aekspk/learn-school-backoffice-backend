import { IsInt, IsPositive } from 'class-validator';

export class CreateBookingDto {
  @IsInt()
  @IsPositive()
  studentId: number;

  @IsInt()
  @IsPositive()
  classSessionId: number;

  @IsInt()
  @IsPositive()
  packageId: number;
}
