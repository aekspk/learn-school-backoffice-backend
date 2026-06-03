import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Auth } from 'src/auth/guards/auth.guard';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @Auth()
  create(@Body() dto: CreateStudentDto) {
    return this.studentsService.create(dto);
  }

  @Get()
  @Auth()
  findAll() {
    return this.studentsService.findAll();
  }

  @Get(':id')
  @Auth()
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.studentsService.findOne(id);
  }

  @Get(':id/packages')
  @Auth()
  findPackages(@Param('id', ParseIntPipe) id: number) {
    return this.studentsService.findPackages(id);
  }

  @Get(':id/bookings')
  @Auth()
  findBookings(@Param('id', ParseIntPipe) id: number) {
    return this.studentsService.findBookings(id);
  }

  @Patch(':id')
  @Auth()
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStudentDto) {
    return this.studentsService.update(id, dto);
  }

  @Delete(':id')
  @Auth(Role.HQ_ADMIN, Role.BRANCH_MANAGER)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.studentsService.remove(id);
  }
}
