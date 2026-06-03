import { Module } from '@nestjs/common';
import { ClassSessionsService } from './class-sessions.service';
import { ClassSessionsController } from './class-sessions.controller';

@Module({
  controllers: [ClassSessionsController],
  providers: [ClassSessionsService],
})
export class ClassSessionsModule {}
