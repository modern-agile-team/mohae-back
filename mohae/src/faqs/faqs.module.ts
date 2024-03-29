import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { UserRepository } from 'src/auth/repository/user.repository';
import { cacheModule } from 'src/common/configs/redis.config';
import { ErrorConfirm } from 'src/common/utils/error';
import { FaqsController } from './faqs.controller';
import { FaqsService } from './faqs.service';
import { FaqRepository } from './repository/faq.repository';

@Module({
  imports: [
    cacheModule,
    TypeOrmModule.forFeature([FaqRepository, UserRepository]),
    AuthModule,
    ConfigModule,
  ],
  controllers: [FaqsController],
  providers: [FaqsService, ErrorConfirm],
})
export class FaqsModule {}
