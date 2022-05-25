import { InternalServerErrorException } from '@nestjs/common';
import { User } from 'src/auth/entity/user.entity';
import { Board } from 'src/boards/entity/board.entity';
import { EntityRepository, Repository } from 'typeorm';
import { CreateReviewDto } from '../dto/create-review.dto';
import { Review } from '../entity/review.entity';

@EntityRepository(Review)
export class ReviewRepository extends Repository<Review> {
  async createReview(
    { description, rating }: CreateReviewDto,
    reviewer: User,
    board: Board,
  ): Promise<number> {
    try {
      const { raw }: any = await this.createQueryBuilder('reviews')
        .insert()
        .into(Review)
        .values({ description, rating, reviewer, board })
        .execute();

      return raw.affectedRows;
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

  async readUserReviews(userNo: number): Promise<object | undefined> {
    try {
      const qb = this.createQueryBuilder('reviews')
        .leftJoin('reviews.board', 'board')
        .leftJoin('reviews.reviewer', 'reviewer')
        .leftJoin('board.user', 'user')
        .select([
          'reviews.no',
          'reviews.reviewer',
          'reviews.description',
          'reviews.rating',
          'reviews.createdAt',
          'board.no',
          'board.title',
          'reviewer.no',
          'reviewer.nickname',
          'reviewer.photo_url',
        ])
        .where('user.no = :userNo', { userNo });
      const reviews = await qb.getMany();
      const count = await qb.getCount();

      return { reviews, count };
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }
}
