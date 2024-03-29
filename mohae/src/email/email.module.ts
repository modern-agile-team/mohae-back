import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { UserRepository } from 'src/auth/repository/user.repository';
import { AwsService } from 'src/aws/aws.service';
import { cacheModule } from 'src/common/configs/redis.config';
import { ErrorConfirm } from 'src/common/utils/error';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';

@Module({
  imports: [
    cacheModule,
    TypeOrmModule.forFeature([UserRepository]),
    AuthModule,
  ],
  controllers: [EmailController],
  providers: [EmailService, ErrorConfirm, AwsService],
})
export class EmailModule {}
