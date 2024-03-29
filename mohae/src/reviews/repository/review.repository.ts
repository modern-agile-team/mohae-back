import { InternalServerErrorException } from '@nestjs/common';
import { User } from 'src/auth/entity/user.entity';
import { Board } from 'src/boards/entity/board.entity';
import {
  EntityRepository,
  InsertResult,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { CreateReviewDto } from '../dto/create-review.dto';
import { Review } from '../entity/review.entity';

@EntityRepository(Review)
export class ReviewRepository extends Repository<Review> {
  async createReview(
    { description, rating }: CreateReviewDto,
    reviewer: User,
    targetUser: User,
    board: Board,
  ): Promise<any> {
    try {
      const { raw }: InsertResult = await this.createQueryBuilder('reviews')
        .insert()
        .into(Review)
        .values({ description, rating, reviewer, targetUser, board })
        .execute();

      return raw;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async readAllReview(): Promise<Review[]> {
    try {
      const reviews = await this.createQueryBuilder('reviews')
        .leftJoinAndSelect('reviews.board', 'board')
        .leftJoinAndSelect('reviews.reviewer', 'reviewer')
        .select([
          'reviews.no',
          'reviews.reviewer',
          'reviews.description',
          'reviews.createdAt',
          'board.no',
          'board.title',
          'reviewer.no',
          'reviewer.nickname',
          'reviewer.photo_url',
        ])
        .getMany();

      return reviews;
    } catch (e) {
      throw new InternalServerErrorException(
        `${e} ### 리뷰 전체 조회 : 알 수 없는 서버 에러입니다.`,
      );
    }
  }

  async readUserReviews(
    userNo: number,
    take: number,
    page: number,
  ): Promise<object | undefined> {
    try {
      const qb: SelectQueryBuilder<Review> = this.createQueryBuilder('reviews')
        .leftJoin('reviews.reviewer', 'reviewer')
        .leftJoin('reviews.targetUser', 'targetUser')
        .leftJoin('reviews.board', 'board')
        .leftJoin('board.user', 'user')
        .leftJoin('board.photos', 'photo')
        .select([
          'reviews.no AS reviewNo ',
          'reviews.targetUser AS user',
          'reviews.description AS description',
          'reviews.rating AS rating',
          `DATE_FORMAT(reviews.createdAt, '%Y년 %m월 %d일') AS createdAt`,
          'board.no AS boardNo',
          'board.title AS boardTitle ',
          'photo.photo_url AS photoUrl',
          'reviewer.no AS reviewerNo',
          'reviewer.nickname AS reviewerNickname',
          'reviewer.photo_url AS reviewerPhotoUrl',
        ])
        .where('targetUser.no = :userNo', { userNo })
        .take(take)
        .skip(take * (page - 1));

      const reviews = await qb.getRawMany();
      const count = await qb.getCount();

      return { reviews, count };
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async checkDuplicateReview(
    requesterNo: number,
    targetUserNo: number,
    boardNo: number,
  ): Promise<boolean> {
    try {
      const isReview: number = await this.createQueryBuilder('review')
        .leftJoin('review.reviewer', 'reviewer')
        .leftJoin('review.targetUser', 'targetUser')
        .leftJoin('review.board', 'board')
        .where(
          'reviewer.no = :targetUserNo AND targetUser.no = :requesterNo And board.no = :boardNo',
          {
            targetUserNo,
            requesterNo,
            boardNo,
          },
        )
        .getCount();

      return !!isReview;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }
}
