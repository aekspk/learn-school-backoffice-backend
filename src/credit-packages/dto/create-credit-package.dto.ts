import { Type } from 'class-transformer';
import { IsDate, IsInt, IsPositive } from 'class-validator';

export class CreateCreditPackageDto {
  @IsInt()
  @IsPositive()
  studentId: number;

  @IsInt()
  @IsPositive()
  courseId: number;

  @IsInt()
  @IsPositive()
  totalCredits: number;

  @Type(() => Date)
  @IsDate()
  expiresAt: Date;
}
