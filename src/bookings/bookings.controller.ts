import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Auth } from 'src/auth/guards/auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from 'src/auth/models/access-token-payload.model';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @Auth()
  create(@Body() dto: CreateBookingDto) {
    return this.bookingsService.createBooking(dto);
  }

  @Get()
  @Auth()
  findAll(
    @Query('classSessionId') classSessionId?: string,
    @Query('studentId') studentId?: string,
  ) {
    return this.bookingsService.findAll(
      classSessionId ? Number(classSessionId) : undefined,
      studentId ? Number(studentId) : undefined,
    );
  }

  @Get(':id')
  @Auth()
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.bookingsService.findOne(id);
  }

  @Patch(':id/attendance')
  @Auth()
  markAttendance(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MarkAttendanceDto,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.bookingsService.markAttendance(id, dto, user.sub);
  }

  @Delete(':id')
  @Auth()
  @HttpCode(HttpStatus.OK)
  cancel(@Param('id', ParseIntPipe) id: number) {
    return this.bookingsService.cancelBooking(id);
  }
}
