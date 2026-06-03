import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Auth } from 'src/auth/guards/auth.guard';
import { BranchAccessGuard } from 'src/auth/guards/branch-access.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from 'src/auth/models/access-token-payload.model';
import { ClassSessionsService } from './class-sessions.service';
import { CreateClassSessionDto } from './dto/create-class-session.dto';
import { UpdateClassSessionDto } from './dto/update-class-session.dto';

@Controller('class-sessions')
export class ClassSessionsController {
  constructor(private readonly classSessionsService: ClassSessionsService) {}

  // EC#10 — BranchAccessGuard validates body.branchId matches the caller's branch
  @Post()
  @UseGuards(BranchAccessGuard)
  @Auth(Role.HQ_ADMIN, Role.BRANCH_MANAGER, Role.BRANCH_STAFF)
  create(@Body() dto: CreateClassSessionDto) {
    return this.classSessionsService.create(dto);
  }

  // Branch staff see only their own branch; HQ_ADMIN can filter by any branchId
  @Get()
  @Auth()
  findAll(
    @Query('branchId') branchId: string | undefined,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    const effectiveBranchId =
      user.role === Role.HQ_ADMIN
        ? branchId !== undefined
          ? Number(branchId)
          : undefined
        : (user.branchId ?? undefined);

    return this.classSessionsService.findAll(effectiveBranchId);
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
