import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CompensationStatus } from '@prisma/client';
import type { AuthUser } from 'src/auth/models/current-user.model';
import { Auth } from 'src/auth/guards/auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { CompensationsService } from './compensations.service';
import { CreateCompensationDto } from './dto/create-compensation.dto';
import { ResolveCompensationDto } from './dto/resolve-compensation.dto';

@Controller('compensations')
export class CompensationsController {
  constructor(private readonly compensationsService: CompensationsService) {}

  @Post()
  @Auth()
  create(@Body() dto: CreateCompensationDto) {
    return this.compensationsService.create(dto);
  }

  @Get()
  @Auth()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: CompensationStatus,
  ) {
    return this.compensationsService.findAll(Number(user.branchId), status);
  }

  @Get(':id')
  @Auth()
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.compensationsService.findOne(id);
  }

  // EC#8 — guard against modifying a RESOLVED compensation
  @Patch(':id/resolve')
  @Auth()
  resolve(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResolveCompensationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.compensationsService.resolve(id, dto, user.id);
  }
}
