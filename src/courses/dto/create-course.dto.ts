import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @IsPositive()
  totalSessions: number;
}
