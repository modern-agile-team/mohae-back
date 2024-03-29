import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRepository } from 'src/auth/repository/user.repository';
import { BoardRepository } from 'src/boards/repository/board.repository';
import { ErrorConfirm } from 'src/common/utils/error';
import { ReplyRepository } from 'src/replies/repository/reply.repository';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { CommentRepository } from './repository/comment.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CommentRepository,
      BoardRepository,
      UserRepository,
      ReplyRepository,
    ]),
  ],
  controllers: [CommentsController],
  providers: [CommentsService, ErrorConfirm],
})
export class CommentsModule {}
