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
import type { User } from '@prisma/client';
import { Auth } from 'src/auth/guards/auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { ClassSessionsService } from './class-sessions.service';
import { CreateClassSessionDto } from './dto/create-class-session.dto';
import { UpdateClassSessionDto } from './dto/update-class-session.dto';

@Controller('class-sessions')
export class ClassSessionsController {
  constructor(private readonly classSessionsService: ClassSessionsService) {}

  @Post()
  @Auth(Role.HQ_ADMIN, Role.BRANCH_MANAGER, Role.BRANCH_STAFF)
  create(@CurrentUser() user: User, @Body() dto: CreateClassSessionDto) {
    return this.classSessionsService.create(user.branchId!, dto);
  }

  @Get()
  @Auth()
  findAll(@CurrentUser() user: User) {
    return this.classSessionsService.findAll(user.branchId ?? undefined);
  }

  @Get(':id/eligible-students')
  findEligibleStudents(@Param('id', ParseIntPipe) id: number) {
    return this.classSessionsService.findEligibleStudents(id);
  }

  @Get(':id')
  @Auth()
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.classSessionsService.findOne(id);
  }

  @Patch(':id')
  @Auth(Role.HQ_ADMIN, Role.BRANCH_MANAGER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClassSessionDto,
  ) {
    return this.classSessionsService.update(id, dto);
  }

  @Delete(':id')
  @Auth(Role.HQ_ADMIN, Role.BRANCH_MANAGER)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.classSessionsService.remove(id);
  }
}
