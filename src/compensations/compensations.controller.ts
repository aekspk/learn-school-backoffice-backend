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
import { CompensationStatus, Role } from '@prisma/client';
import { Auth } from 'src/auth/guards/auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from 'src/auth/models/access-token-payload.model';
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
  findAll(@Query('status') status?: CompensationStatus) {
    return this.compensationsService.findAll(status);
  }

  @Get(':id')
  @Auth()
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.compensationsService.findOne(id);
  }

  // EC#8 — guard against modifying a RESOLVED compensation
  @Patch(':id/resolve')
  @Auth(Role.HQ_ADMIN, Role.BRANCH_MANAGER)
  resolve(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResolveCompensationDto,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.compensationsService.resolve(id, dto, user.sub);
  }
}
