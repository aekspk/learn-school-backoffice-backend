import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, IsPositive } from 'class-validator';

export class CreateClassSessionDto {
  @IsInt()
  @IsPositive()
  courseId: number;

  @Type(() => Date)
  @IsDate()
  scheduledAt: Date;

  @IsInt()
  @IsPositive()
  @IsOptional()
  durationMin?: number;

  @IsInt()
  @IsPositive()
  totalSeats: number;
}
