import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AreasRepository } from 'src/areas/repository/area.repository';
import { AuthModule } from 'src/auth/auth.module';
import { UserRepository } from 'src/auth/repository/user.repository';
import { BoardsModule } from 'src/boards/boards.module';
import { BoardsService } from 'src/boards/boards.service';
import { BoardRepository } from 'src/boards/repository/board.repository';
import { CategoryRepository } from 'src/categories/repository/category.repository';
import { BoardPhotoRepository } from 'src/photo/repository/photo.repository';
import { ErrorConfirm } from 'src/common/utils/error';
import { ReviewRepository } from './repository/review.repository';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReviewRepository,
      BoardRepository,
      CategoryRepository,
      AreasRepository,
      UserRepository,
      BoardPhotoRepository,
    ]),
    BoardsModule,
    AuthModule,
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService, ErrorConfirm],
})
export class ReviewsModule {}
