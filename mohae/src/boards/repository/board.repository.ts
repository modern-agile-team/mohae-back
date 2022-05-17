import { InternalServerErrorException } from '@nestjs/common';
import { User } from 'src/auth/entity/user.entity';
import { Category } from 'src/categories/entity/category.entity';
import { DeleteResult, EntityRepository, Repository } from 'typeorm';
import { CreateBoardDto } from '../dto/board.dto';
import { Board } from '../entity/board.entity';

@EntityRepository(Board)
export class BoardRepository extends Repository<Board> {
  async getByOneBoard(no: number) {
    try {
      return await this.createQueryBuilder('boards')
        .leftJoin('boards.area', 'areas')
        .leftJoin('boards.category', 'categories')
        .leftJoin('boards.user', 'users')
        .leftJoin('users.school', 'school')
        .leftJoin('users.major', 'major')
        .leftJoin('boards.likedUser', 'likedUser')
        .select([
          'boards.no AS no',
          'DATEDIFF(boards.deadline, now()) AS decimalDay',
          'boards.title AS title',
          'boards.description AS description',
          'boards.isDeadline AS isDeadline',
          'boards.hit AS hit',
          'COUNT(likedUser.likedBoardNo) AS likeCount',
          'boards.price AS price',
          'boards.summary AS summary',
          'boards.target AS target',
          'boards.note1 AS note1',
          'boards.note2 AS note2',
          'boards.note3 AS note3',
          'areas.no AS areaNo',
          'areas.name AS areaName',
          'categories.no AS categoryNo',
          'categories.name AS categoryName',
          'users.no AS userNo',
          'users.name AS userName',
          'users.nickname AS userNickname',
          'users.photo_url AS userPhotoUrl',
          'school.name AS userSchool',
          'major.name AS userMajor',
        ])
        .where('boards.no = :no', { no })
        .andWhere('boards.area = areas.no')
        .andWhere('boards.category = categories.no')
        .andWhere('likedUser.likedBoardNo = :no', { no })
        .getRawOne();
    } catch (e) {
      `${e} ### 게시판 상세 조회 : 알 수 없는 서버 에러입니다.`;
    }
  }

  async readHotBoards(
    select: number,
    year: number,
    month: number,
  ): Promise<Object> {
    try {
      const hotBoards = this.createQueryBuilder('boards')
        .leftJoin('boards.area', 'areas')
        .leftJoin('boards.user', 'users')
        .leftJoin('boards.likedUser', 'likedUsers')
        .select([
          'likedUsers',
          'boards.no AS no',
          'DATEDIFF(boards.deadline, now()) AS decimalDay',
          'boards.title AS title',
          'boards.isDeadline AS isDeadline',
          'boards.price AS price',
          'boards.target AS target',
          'areas.no AS areaNo',
          'areas.name AS areaName',
          'users.nickname AS userNickname',
        ])
        .where('Year(boards.createdAt) <= :year', { year })
        .andWhere('Month(boards.createdAt) <= :month', { month })
        .orderBy('boards.hit / DATEDIFF(now(), boards.createdAt)', 'DESC')
        .limit(3);

      if (select === 1) {
        hotBoards.andWhere('boards.isDeadline = false');
      }

      if (select === 2) {
        hotBoards.andWhere('boards.isDeadline = true');
      }
      const filteredHotBoards = await hotBoards.getRawMany();

      return { year, month, filteredHotBoards };
    } catch (e) {
      `${e} ### 인기 게시판 조회 : 알 수 없는 서버 에러입니다.`;
    }
  }

  async addBoardHit({ no, hit }): Promise<Number> {
    try {
      const { affected } = await this.createQueryBuilder()
        .update(Board)
        .set({ hit: hit + 1 })
        .where('no = :no', { no })
        .execute();

      return affected;
    } catch (e) {
      throw new InternalServerErrorException(
        `${e} ### 게시판 조회수 증가 : 알 수 없는 서버 에러입니다.`,
      );
    }
  }

  async cancelClosedBoard(no: number) {
    try {
      const { affected } = await this.createQueryBuilder()
        .update(Board)
        .set({ isDeadline: false })
        .where('no = :no', { no })
        .execute();

      return affected;
    } catch (e) {
      throw new InternalServerErrorException(
        `${e} ### 게시판 활성화 : 알 수 없는 서버 에러입니다.`,
      );
    }
  }

  async boardClosed(no: number): Promise<Object> {
    try {
      const { affected } = await this.createQueryBuilder()
        .update(Board)
        .set({ isDeadline: true })
        .where('no = :no', { no })
        .execute();

      return affected;
    } catch (e) {
      throw new InternalServerErrorException(
        `${e} ### 게시판 비활성화 : 알 수 없는 서버 에러입니다.`,
      );
    }
  }

  async closingBoard(currentTime: Date) {
    try {
      const { affected } = await this.createQueryBuilder()
        .update(Board)
        .set({ isDeadline: true })
        .where(`deadline is not null`)
        .andWhere('deadline <= :currentTime', { currentTime })
        .andWhere('isDeadline = false')
        .execute();

      return affected;
    } catch (e) {
      throw new InternalServerErrorException(
        `${e} ### 게시판 마감 처리 : 알 수 없는 서버 에러입니다.`,
      );
    }
  }

  async searchAllBoards(title: string): Promise<Board[]> {
    try {
      const boards = await this.createQueryBuilder('boards')
        .leftJoin('boards.area', 'areas')
        .leftJoin('boards.user', 'users')
        .select([
          'boards.no AS no',
          'DATEDIFF(boards.deadline, now()) AS decimalDay',
          'boards.title AS title',
          'boards.isDeadline AS isDeadline',
          'boards.price AS price',
          'boards.target AS target',
          'areas.no AS areaNo',
          'areas.name AS areaName',
          'users.nickname AS userNickname',
        ])
        .where('boards.title like :title', { title: `%${title}%` })
        .orderBy('boards.no', 'DESC')
        .getRawMany();

      return boards;
    } catch (e) {
      throw new InternalServerErrorException(
        `${e} ### 게시글 검색 : 알 수 없는 서버 에러입니다.`,
      );
    }
  }

  async filteredBoards(
    categoryNo: number,
    sort: any,
    title: string,
    popular: string,
    areaNo: number,
    max: number,
    min: number,
    target: boolean,
    date: any,
    endTime: Date,
    currentTime: Date,
    free: string,
  ): Promise<Board[]> {
    try {
      const boardFiltering = this.createQueryBuilder('boards')
        .leftJoin('boards.area', 'areas')
        .leftJoin('boards.category', 'categories')
        .leftJoin('boards.user', 'users')
        .select([
          'boards.no AS no',
          'DATEDIFF(boards.deadline, now()) AS decimalDay',
          'boards.title AS title',
          'boards.isDeadline AS isDeadline',
          'boards.price AS price',
          'boards.target AS target',
          'areas.no AS areaNo',
          'areas.name AS areaName',
          'users.nickname AS userNickname',
        ])
        .orderBy('boards.no', sort);

      if (categoryNo) {
        boardFiltering.andWhere('boards.category = :categoryNo', {
          categoryNo,
        });
      }
      if (title)
        boardFiltering.andWhere('boards.title like :title', {
          title: `%${title}%`,
        });
      if (areaNo) boardFiltering.andWhere('boards.area = :areaNo', { areaNo });
      if (max) boardFiltering.andWhere('boards.price < :max', { max });
      if (min) boardFiltering.andWhere('boards.price >= :min', { min });
      if (target)
        boardFiltering.andWhere('boards.target = :target', { target });
      if (date === NaN) {
        boardFiltering.andWhere('boards.deadline is null');
      }
      if (date) {
        boardFiltering.andWhere('boards.deadline < :endTime', { endTime });
        boardFiltering.andWhere('boards.deadline > :currentTime', {
          currentTime,
        });
      }
      if (free) boardFiltering.andWhere('boards.price = 0');
      if (popular) boardFiltering.orderBy('boards.hit', 'DESC');

      return await boardFiltering.getRawMany();
    } catch (err) {
      throw new InternalServerErrorException(
        `${err} ### 게시판 필터링 조회 : 알 수 없는 서버 에러입니다.`,
      );
    }
  }

  async getAllBoards(): Promise<Board[]> {
    try {
      return await this.createQueryBuilder('boards')
        .leftJoin('boards.area', 'areas')
        .leftJoin('boards.category', 'categories')
        .leftJoin('boards.user', 'users')
        .select([
          'DATEDIFF(boards.deadline, now()) AS decimalDay',
          'boards.no AS no',
          'boards.title AS title',
          'boards.isDeadline AS isDeadline',
          'boards.price AS price',
          'boards.target AS target',
          'areas.no AS areaNo',
          'areas.name AS areaName',
          'users.nickname AS userNickname',
        ])
        .where('boards.area = areas.no')
        .andWhere('boards.category = categories.no')
        .orderBy('boards.no', 'DESC')
        .getRawMany();
    } catch (err) {
      throw new InternalServerErrorException(
        `${err} ### 게시판 전체 조회 : 알 수 없는 서버 에러입니다.`,
      );
    }
  }

  async createBoard(
    category: Category,
    area: object,
    user: User,
    createBoardDto: CreateBoardDto,
    endTime: Date,
  ) {
    try {
      const {
        price,
        title,
        description,
        summary,
        target,
        note1,
        note2,
        note3,
      } = createBoardDto;
      const board = await this.createQueryBuilder('boards')
        .insert()
        .into(Board)
        .values([
          {
            price,
            title,
            description,
            summary,
            target,
            category,
            area,
            user,
            note1,
            note2,
            note3,
            deadline: endTime,
          },
        ])
        .execute();

      return board.raw;
    } catch (err) {
      throw new InternalServerErrorException(
        `${err} ### 게시판 생성: 알 수 없는 서버 에러입니다.`,
      );
    }
  }

  async updateBoard(no: number, deletedNullBoardKey: any): Promise<Object> {
    try {
      const { affected } = await this.createQueryBuilder()
        .update(Board)
        .set(deletedNullBoardKey)
        .where('no = :no', { no })
        .execute();

      return affected;
    } catch (err) {
      throw new InternalServerErrorException(
        `${err} ### 게시판 수정: 알 수 없는 서버 에러입니다.`,
      );
    }
  }

  async deleteBoard(no: number): Promise<DeleteResult> {
    try {
      const result = await this.createQueryBuilder()
        .softDelete()
        .from(Board)
        .where('no = :no', { no })
        .execute();

      return result;
    } catch (err) {
      throw new InternalServerErrorException(
        `${err} ### 게시판 삭제: 알 수 없는 서버 에러입니다.`,
      );
    }
  }

  async saveCategory(categoryNo: number, board: Board) {
    try {
      await this.createQueryBuilder()
        .relation(Category, 'boards')
        .of(categoryNo)
        .add(board);
    } catch (e) {
      throw new InternalServerErrorException();
    }
  }
}
