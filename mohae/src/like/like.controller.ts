import {
  Body,
  Controller,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { User } from 'src/auth/entity/user.entity';
import { HTTP_STATUS_CODE } from 'src/common/configs/http-status.config';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { operationConfig } from 'src/common/swagger-apis/api-operation.swagger';
import { LikeBoardDto } from './dto/board-like.dto';
import { LikeUserDto } from './dto/user-like.dto';
import { LikeService } from './like.service';
import { boardLike } from './like.swagger';

@UseGuards(AuthGuard('jwt-refresh-token'))
@ApiBearerAuth('access-token')
@Controller('like')
@ApiTags('like')
export class LikeController {
  constructor(private likeService: LikeService) {}

  @ApiOperation({
    summary: '회원간 좋아요 API',
    description: '회원간에 좋아요를 누를 때 사용되는 api',
  })
  @ApiOkResponse({
    description: '성공적으로 좋아요가 눌린 경우.',
    schema: {
      example: {
        statusCode: 201,
        msg: '성공적으로 요청이 처리되었습니다.',
      },
    },
  })
  @ApiNotFoundResponse({
    description: '좋아요 누르려는 프로필 주인이 존재하지 않는 회원이였을 경우',
    schema: {
      example: {
        statusCode: 404,
        msg: '~번의 유저는 존재하지 않는 유저 입니다.',
        err: 'Not Found',
      },
    },
  })
  @ApiConflictResponse({
    description: '좋아요 혹은 좋아요 취소를 중복으로 요청한 경우',
    schema: {
      example: {
        statusCode: 409,
        msg: '좋아요(좋아요 취소)를 중복해서 요청할 수 없습니다 (좋아요 (취소)는 judge true(false)로 넣어주세요)',
        err: 'Conflict',
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: '요청에 대한 응답 처리중 서버에러가 발생한 경우',
    schema: {
      example: {
        statusCode: 500,
        msg: 'DB관련한 에러 메시지 + ~에서 일어난 에러입니다.',
        err: 'InternalServerErrorException',
      },
    },
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt-refresh-token'))
  @HttpCode(HTTP_STATUS_CODE.success.created)
  @Post('/user')
  async likeUser(@Body() likeUserDto: LikeUserDto, @CurrentUser() user: User) {
    try {
      await this.likeService.likeUser(user, likeUserDto);

      return Object.assign({
        success: true,
        msg: '성공적으로 요청이 처리되었습니다.',
      });
    } catch (err) {
      throw err;
    }
  }

  @ApiOperation(operationConfig('게시글 좋아요 경로', '게시글 좋아요 API'))
  @ApiOkResponse(boardLike.like.success)
  @ApiUnauthorizedResponse(boardLike.like.unauthorized)
  @ApiConflictResponse(boardLike.like.conflict)
  @ApiNotFoundResponse(boardLike.like.notFound)
  @HttpCode(HTTP_STATUS_CODE.success.ok)
  @Post('/board/:boardNo')
  async likeBoard(
    @Param('boardNo') boardNo: number,
    @Body() likeBoardDto: LikeBoardDto,
    @CurrentUser() user: User,
  ): Promise<object> {
    const likeBoard: any = await this.likeService.likeBoard(
      user.no,
      boardNo,
      likeBoardDto,
    );

    return {
      msg: likeBoard.msg,
    };
  }
}
