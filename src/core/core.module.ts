import { Global, Module } from '@nestjs/common';
import { PrismaService } from './services/prisma.service';
import { AuthModule } from 'src/auth/auth.module';
import { CacheModule } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';

@Global()
@Module({
  imports: [
    AuthModule,
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: () => {
        const url = `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;

        return {
          stores: [new KeyvRedis(url)],
          ttl: 60_000,
        };
      },
    }),
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class CoreModule {}
