import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { CoreModule } from './core/core.module';
import { UsersModule } from './users/users.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { BookingsModule } from './bookings/bookings.module';
import { BranchesModule } from './branches/branches.module';
import { StudentsModule } from './students/students.module';
import { CoursesModule } from './courses/courses.module';
import { CreditPackagesModule } from './credit-packages/credit-packages.module';
import { ClassSessionsModule } from './class-sessions/class-sessions.module';
import { CompensationsModule } from './compensations/compensations.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      serveRoot: '/uploads',
      rootPath: join(__dirname, '../uploads'),
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    CoreModule,
    UsersModule,
    AuthModule,
    BookingsModule,
    BranchesModule,
    StudentsModule,
    CoursesModule,
    CreditPackagesModule,
    ClassSessionsModule,
    CompensationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
