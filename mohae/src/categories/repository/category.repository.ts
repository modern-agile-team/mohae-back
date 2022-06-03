import { InternalServerErrorException } from '@nestjs/common';
import { Area } from 'src/areas/entity/areas.entity';
import { User } from 'src/auth/entity/user.entity';
import { Board } from 'src/boards/entity/board.entity';
import { EntityRepository, Repository, SelectQueryBuilder } from 'typeorm';
import { Category } from '../entity/category.entity';

@EntityRepository(Category)
export class CategoryRepository extends Repository<Category> {
  async findAllCategory(): Promise<Category[]> {
    try {
      const categories = await this.createQueryBuilder('categories')
        .leftJoinAndSelect('categories.boards', 'boards')
        .where('categories.no = boards.category')
        .getMany();
      return categories;
    } catch (e) {
      throw new InternalServerErrorException(e);
    }
  }

  async findOneCategory(no: number): Promise<object> {
    try {
      const category: SelectQueryBuilder<Category> = this.createQueryBuilder(
        'categories',
      )
        .leftJoin('categories.boards', 'board')
        .leftJoin('board.area', 'area')
        .leftJoin('board.user', 'user')
        .leftJoin('board.photos', 'photo')
        .where('categories.no = :no', { no });

      const { categoryName }: any = await category
        .addSelect(['categories.name AS categoryName'])
        .getRawOne();

      const boards: Board[] = await category
        .select([
          'DATEDIFF(board.deadline, now()) AS decimalDay',
          'photo.photo_Url AS photoUrl',
          'board.no AS no',
          'board.title AS title',
          'board.isDeadline AS isDeadline',
          'board.price AS price',
          'board.target AS target',
          'area.no AS areaNo',
          'area.name AS areaName',
          'user.nickname AS userNickname',
        ])
        .groupBy('board.no')
        .having('COUNT(board.no) > 0')
        .orderBy('board.no', 'DESC')
        .getRawMany();

      return { boards, categoryName };
    } catch (err) {
      throw new InternalServerErrorException(
        `${err}, ### 카테고리 선택조회 관련 서버에러`,
      );
    }
  }

  async selectCategory(categories: Array<number>) {
    try {
      return [
        await this.createQueryBuilder('categories')
          .select()
          .where('categories.no = :no', { no: categories[0] })
          .getOne(),
        await this.createQueryBuilder('categories')
          .select()
          .where('categories.no = :no', { no: categories[1] })
          .getOne(),
        await this.createQueryBuilder('categories')
          .select()
          .where('categories.no = :no', { no: categories[2] })
          .getOne(),
      ];
    } catch (err) {
      throw new InternalServerErrorException(
        `${err} selectCategory 메소드 관련 서버에러`,
      );
    }
  }

  async addUser(categoryNo: number, user: User) {
    try {
      await this.createQueryBuilder()
        .relation(Category, 'users')
        .of(categoryNo)
        .add(user);
    } catch (e) {
      throw new InternalServerErrorException(`
        ${e} ### 유저 회원 가입도중 카테고리정보 저장 관련 알 수없는 서버에러입니다. `);
    }
  }

  async readHotCategories(): Promise<Category[]> {
    try {
      return await this.createQueryBuilder('categories')
        .select(['categories.no', 'categories.name'])
        .orderBy('categories.hit', 'DESC')
        .where('categories.hit > 0')
        .limit(3)
        .getMany();
    } catch (e) {
      throw new InternalServerErrorException(
        `${e} ### 인기 카테고리 조회 : 알 수 없는 서버 에러입니다.`,
      );
    }
  }
}
