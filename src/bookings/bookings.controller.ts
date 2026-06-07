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
import { Auth } from 'src/auth/guards/auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import type { AuthUser } from 'src/auth/models/current-user.model';
import { MarkAttendancesDto } from './dto/mark-attendances.dto ';

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

  @Patch(':bookingId/attendance')
  @Auth()
  markAttendance(
    @Param('bookingId', ParseIntPipe) bookingId: number,
    @Body() dto: MarkAttendanceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.bookingsService.markAttendance(bookingId, dto, user.id);
  }

  @Patch('/attendances')
  @Auth()
  markAttendances(
    @Body() dto: MarkAttendancesDto[],
    @CurrentUser() user: AuthUser,
  ) {
    return this.bookingsService.markAttendances(dto, user.id);
  }
}
