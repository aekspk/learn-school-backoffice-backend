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
} from '@nestjs/common';
import { Auth } from 'src/auth/guards/auth.guard';
import { CreditPackagesService } from './credit-packages.service';
import { CreateCreditPackageDto } from './dto/create-credit-package.dto';
import { UpdateCreditPackageDto } from './dto/update-credit-package.dto';

@Controller('credit-packages')
export class CreditPackagesController {
  constructor(private readonly creditPackagesService: CreditPackagesService) {}

  @Post()
  @Auth()
  create(@Body() dto: CreateCreditPackageDto) {
    return this.creditPackagesService.create(dto);
  }

  @Get()
  @Auth()
  findAll(@Query('studentId') studentId?: string) {
    return this.creditPackagesService.findAll(
      studentId ? Number(studentId) : undefined,
    );
  }

  @Get(':id')
  @Auth()
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.creditPackagesService.findOne(id);
  }

  @Patch(':id')
  @Auth()
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCreditPackageDto,
  ) {
    return this.creditPackagesService.update(id, dto);
  }

  @Delete(':id')
  @Auth()
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.creditPackagesService.remove(id);
  }
}
