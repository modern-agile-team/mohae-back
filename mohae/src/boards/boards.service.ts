import {
  BadGatewayException,
  BadRequestException,
  CACHE_MANAGER,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, EntityManager, getManager, QueryRunner } from 'typeorm';
import { User } from '@sentry/node';
import { CategoryRepository } from 'src/categories/repository/category.repository';
import { AreasRepository } from 'src/areas/repository/area.repository';
import { BoardRepository } from './repository/board.repository';
import { UserRepository } from 'src/auth/repository/user.repository';
import { BoardPhotoRepository } from 'src/photo/repository/photo.repository';
import { ErrorConfirm } from 'src/common/utils/error';
import { Board } from './entity/board.entity';
import { Category } from 'src/categories/entity/category.entity';
import { Area } from 'src/areas/entity/areas.entity';
import { FilterBoardDto } from './dto/filterBoard.dto';
import { HotBoardDto } from './dto/hotBoard.dto';
import { SearchBoardDto } from './dto/searchBoard.dto';
import { PaginationDto } from './dto/pagination.dto';
import { CreateBoardDto } from './dto/createBoard.dto';
import { Cache } from 'cache-manager';

export interface boardInfo {
  affectedRows: number;
  insertId?: number;
}

export interface BoardData extends Board {
  endDate?: Date;
  likeCount?: number;
}

@Injectable()
export class BoardsService {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,

    @InjectRepository(BoardRepository)
    private readonly boardRepository: BoardRepository,

    @InjectRepository(AreasRepository)
    private readonly areaRepository: AreasRepository,

    @InjectRepository(CategoryRepository)
    private readonly categoryRepository: CategoryRepository,

    @InjectRepository(UserRepository)
    private readonly userRepository: UserRepository,

    private readonly connection: Connection,

    private readonly errorConfirm: ErrorConfirm,
  ) {}

  async closingBoard(): Promise<number> {
    try {
      const result: number = await this.boardRepository.closingBoard();

      return result;
    } catch (err) {
      throw err;
    }
  }

  async filteredBoards(filterBoardDto: FilterBoardDto): Promise<Board[]> {
    try {
      const { date }: FilterBoardDto = filterBoardDto;

      const currentTime: Date = new Date();
      currentTime.setHours(currentTime.getHours() + 9);

      let endTime: Date = new Date();

      if (!date) {
        endTime = null;
      } else {
        endTime.setHours(endTime.getHours() + 9);
        endTime.setDate(endTime.getDate() + +date);
      }

      const boardKey: string[] = Object.keys(filterBoardDto);

      const duplicateCheck: object = {};

      boardKey.forEach((item: any) => {
        filterBoardDto[item] !== 'null'
          ? (duplicateCheck[item] = filterBoardDto[item])
          : 0;
      });

      const filteredBoard: Board[] = await this.boardRepository.filteredBoards(
        duplicateCheck,
        +date,
        endTime,
        currentTime,
      );

      return filteredBoard;
    } catch (err) {
      throw err;
    }
  }

  async readHotBoards(hotBoardDto: HotBoardDto): Promise<Board[]> {
    try {
      const { select }: HotBoardDto = hotBoardDto;
      const currentTime: Date = new Date();
      currentTime.setHours(currentTime.getHours() + 9);
      const year: number = currentTime.getFullYear();
      const month: number = currentTime.getMonth();

      if (month === 12) {
        year - 1;
      }

      const filteredHotBoards: Board[] =
        await this.boardRepository.readHotBoards(+select, year, month);

      if (!filteredHotBoards.length) {
        const replaceReadHotBoards: Board[] =
          await this.boardRepository.replaceReadHotBoards(+select);

        return replaceReadHotBoards;
      }

      return filteredHotBoards;
    } catch (err) {
      throw err;
    }
  }

  async readOneBoardByAuth(boardNo: number, userNo: number): Promise<object> {
    try {
      const user: User = await this.userRepository.findOne(userNo);

      this.errorConfirm.notFoundError(user.no, `해당 회원을 찾을 수 없습니다.`);

      const board: BoardData = await this.boardRepository.readOneBoardByAuth(
        boardNo,
        userNo,
      );

      this.errorConfirm.notFoundError(
        board.no,
        `해당 게시글을 찾을 수 없습니다.`,
      );

      const hit: number = await this.getBoardHit(boardNo, board);
      board.hit = hit;

      board.likeCount = Number(board.likeCount);

      return { board, authorization: true };
    } catch (err) {
      throw err;
    }
  }

  async getBoardHit(boardNo: number, board: Board): Promise<number> {
    try {
      const dailyView: object =
        (await this.cacheManager.get(`dailyView`)) || {};

      const boardNum: string = String(boardNo);

      if (dailyView && dailyView[boardNum]) {
        dailyView[boardNum] += 1;
        await this.cacheManager.set(`dailyView`, dailyView);

        return dailyView[boardNum];
      }

      dailyView[boardNum] = board.hit + 1;
      await this.cacheManager.set(`dailyView`, dailyView);

      return dailyView[boardNum];
    } catch (err) {
      throw err;
    }
  }

  async updateHit(): Promise<number> {
    try {
      const dailyView: null | object = await this.cacheManager.get(`dailyView`);

      if (!dailyView) {
        return 0;
      }

      const keys: string = Object.keys(dailyView).join(',');
      let queryStart: string = 'update boards set hit = (case ';
      const queryEnd: string = `end) where boards.no in (${keys});`;

      for (let boardNo in dailyView) {
        const queryAdd: string = `when boards.no = ${boardNo} then ${dailyView[boardNo]} `;
        queryStart += queryAdd;
      }

      await this.cacheManager.del('dailyView');

      const entityManager: EntityManager = getManager();
      const { affectedRows }: boardInfo = await entityManager.query(
        queryStart + queryEnd,
      );

      return affectedRows;
    } catch (err) {
      throw new InternalServerErrorException(
        `${err}: 게시글 조회수 업데이트: 알 수 없는 서버 에러입니다.`,
      );
    }
  }

  async readOneBoardByUnAuth(boardNo: number): Promise<object> {
    try {
      const board: BoardData = await this.boardRepository.readOneBoardByUnAuth(
        boardNo,
      );

      this.errorConfirm.notFoundError(
        board.no,
        `해당 게시글을 찾을 수 없습니다.`,
      );

      board.likeCount = Number(board.likeCount);

      return { board, authorization: false };
    } catch (err) {
      throw err;
    }
  }

  async boardClosed(boardNo: number, userNo: number): Promise<boolean> {
    try {
      const board: Board = await this.boardRepository.readOneBoardByAuth(
        boardNo,
        userNo,
      );
      this.errorConfirm.notFoundError(board.no, '게시글을 찾을 수 없습니다.');

      if (board['userNo'] !== userNo) {
        throw new UnauthorizedException('게시글을 작성한 유저가 아닙니다.');
      }

      if (board.isDeadline) {
        throw new BadRequestException('이미 마감된 게시글 입니다.');
      }

      const result: number = await this.boardRepository.boardClosed(boardNo);

      if (!result) {
        throw new InternalServerErrorException('게시글 마감이 되지 않았습니다');
      }

      return true;
    } catch (err) {
      throw err;
    }
  }

  async cancelClosedBoard(boardNo: number, userNo: number): Promise<boolean> {
    try {
      const board: BoardData = await this.boardRepository.readOneBoardByAuth(
        boardNo,
        userNo,
      );
      this.errorConfirm.notFoundError(
        board.no,
        `해당 게시글을 찾을 수 없습니다.`,
      );

      if (board['userNo'] !== userNo) {
        throw new UnauthorizedException('게시글을 작성한 유저가 아닙니다.');
      }

      const currentTime: Date = new Date();
      currentTime.setHours(currentTime.getHours() + 9);
      if (board.endDate !== null && board.endDate <= currentTime) {
        throw new BadRequestException('시간이 지나 마감된 게시글 입니다.');
      }

      if (!board.isDeadline) {
        throw new BadRequestException('활성화된 게시글 입니다.');
      }

      const result: number = await this.boardRepository.cancelClosedBoard(
        boardNo,
      );

      if (!result) {
        throw new InternalServerErrorException(
          '게시글 마감 취소가 되지 않았습니다.',
        );
      }

      return true;
    } catch (err) {
      throw err;
    }
  }

  async searchAllBoards(searchBoardDto: SearchBoardDto): Promise<object> {
    try {
      const boards: Board[] = await this.boardRepository.searchAllBoards(
        searchBoardDto,
      );
      this.errorConfirm.notFoundError(boards, '게시글을 찾을 수 없습니다.');

      const { title }: SearchBoardDto = searchBoardDto;

      return { search: title, boards };
    } catch (err) {
      throw err;
    }
  }

  async createBoard(
    createBoardDto: CreateBoardDto,
    user: User,
    boardPhotoUrl: false | string[],
  ): Promise<boolean> {
    const queryRunner: QueryRunner = this.connection.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      if (!boardPhotoUrl) {
        throw new BadRequestException('기본 이미지를 넣어 주세요');
      }

      const { categoryNo, areaNo, deadline } = createBoardDto;

      const category: Category = await this.categoryRepository.findOne(
        categoryNo,
        {
          relations: ['boards'],
        },
      );

      this.errorConfirm.notFoundError(
        category,
        `해당 카테고리를 찾을 수 없습니다.`,
      );

      const area: Area = await this.areaRepository.findOne(areaNo, {
        relations: ['boards'],
      });

      this.errorConfirm.notFoundError(area, `해당 지역을 찾을 수 없습니다.`);

      let endTime: Date = new Date();

      if (!deadline) {
        endTime = null;
      } else {
        endTime.setHours(endTime.getHours() + 9);
        endTime.setDate(endTime.getDate() + +deadline);
      }

      const { affectedRows, insertId }: boardInfo = await queryRunner.manager
        .getCustomRepository(BoardRepository)
        .createBoard(category, area, user, createBoardDto, endTime);

      if (!affectedRows) {
        throw new BadGatewayException('게시글 생성 관련 오류입니다.');
      }

      await queryRunner.manager
        .getCustomRepository(UserRepository)
        .userRelation(user, insertId, 'boards');

      if (boardPhotoUrl[0] !== 'logo.png') {
        await this.registBoardPhotos(boardPhotoUrl, queryRunner, insertId);
      }
      await queryRunner.manager
        .getCustomRepository(BoardRepository)
        .saveCategory(categoryNo, insertId);

      await queryRunner.commitTransaction();

      return true;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async registBoardPhotos(
    boardPhotoUrl: string[],
    queryRunner: QueryRunner,
    insertId: number,
  ): Promise<void> {
    const boardPhotos: object[] = boardPhotoUrl.map(
      (photo: string, index: number) => {
        return {
          photo_url: photo,
          board: insertId,
          order: index + 1,
        };
      },
    );

    const boardPhotoNo: object[] = await queryRunner.manager
      .getCustomRepository(BoardPhotoRepository)
      .createBoardPhoto(boardPhotos);

    if (boardPhotos.length !== boardPhotoNo.length) {
      throw new BadGatewayException('게시글 사진 등록 도중 DB관련 오류');
    }
  }

  async deleteBoard(boardNo: number, userNo: number): Promise<boolean> {
    try {
      const board: Board = await this.boardRepository.readOneBoardByAuth(
        boardNo,
        userNo,
      );
      this.errorConfirm.notFoundError(
        board.no,
        `해당 게시글을 찾을 수 없습니다.`,
      );

      if (board['userNo'] !== userNo) {
        throw new UnauthorizedException('게시글을 작성한 유저가 아닙니다.');
      }

      const result: number = await this.boardRepository.deleteBoard(boardNo);

      if (!result) {
        throw new BadGatewayException('해당 게시글이 삭제되지 않았습니다.');
      }

      return true;
    } catch (err) {
      throw err;
    }
  }

  async updateBoard(
    boardNo: number,
    updateBoardDto,
    userNo: number,
    boardPhotoUrl: false | string[],
  ): Promise<any> {
    const queryRunner: QueryRunner = this.connection.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      if (!boardPhotoUrl) {
        throw new NotFoundException('기본 이미지를 넣어 주세요');
      }

      const { categoryNo, areaNo, deadline } = updateBoardDto;

      updateBoardDto.category = updateBoardDto.categoryNo;
      updateBoardDto.area = updateBoardDto.areaNo;
      delete updateBoardDto.categoryNo;
      delete updateBoardDto.areaNo;

      const board: Board = await this.boardRepository.readOneBoardByAuth(
        boardNo,
        userNo,
      );

      this.errorConfirm.notFoundError(board, `해당 게시글을 찾을 수 없습니다.`);

      if (board['userNo'] !== userNo) {
        throw new UnauthorizedException('게시글을 작성한 유저가 아닙니다.');
      }

      let endTime: Date = new Date(board.createdAt);

      if (deadline) {
        endTime.setDate(endTime.getDate() + deadline);
        updateBoardDto.deadline = endTime;
      }

      const currentTime: Date = new Date();
      currentTime.setHours(currentTime.getHours() + 9);

      if (deadline && endTime <= currentTime) {
        throw new BadRequestException('다른 기간을 선택해 주십시오');
      }

      const boardKey: string[] = Object.keys(updateBoardDto);

      const duplicateCheck: object = {};

      boardKey.forEach((item: any) => {
        updateBoardDto[item] !== null
          ? (duplicateCheck[item] = updateBoardDto[item])
          : 0;
      });

      if (!deadline) {
        endTime = null;
        duplicateCheck['deadline'] = endTime;
      }

      const categoryNum: Category = await this.categoryRepository.findOne(
        categoryNo,
        {
          relations: ['boards'],
        },
      );
      this.errorConfirm.notFoundError(
        categoryNum,
        `해당 카테고리를 찾을 수 없습니다.`,
      );

      const areaNum: Area = await this.areaRepository.findOne(areaNo, {
        relations: ['boards'],
      });

      this.errorConfirm.notFoundError(areaNum, `해당 지역을 찾을 수 없습니다.`);

      const updatedBoard: number = await queryRunner.manager
        .getCustomRepository(BoardRepository)
        .updateBoard(boardNo, duplicateCheck);

      if (!updatedBoard) {
        throw new BadGatewayException('게시글 업데이트 관련 오류');
      }

      return await this.updateBoardPhoto(
        boardNo,
        queryRunner,
        board,
        boardPhotoUrl,
      );
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updateBoardPhoto(
    boardNo: number,
    queryRunner: QueryRunner,
    board: Board,
    boardPhotoUrl: string[],
  ): Promise<string[]> {
    const { photos }: Board = await this.boardRepository.findOne(boardNo, {
      select: ['no', 'photos'],
      relations: ['photos'],
    });

    if (photos.length) {
      const deleteBoardPhoto: number = await queryRunner.manager
        .getCustomRepository(BoardPhotoRepository)
        .deleteBoardPhoto(boardNo);

      if (!deleteBoardPhoto) {
        throw new BadGatewayException('게시글 사진 삭제 도중 DB관련 오류');
      }
    }

    if (boardPhotoUrl[0] !== 'logo.png') {
      await this.registBoardPhotos(boardPhotoUrl, queryRunner, board.no);

      const originBoardPhotosUrl: string[] = photos.map((boardPhoto) => {
        return boardPhoto.photo_url;
      });
      await queryRunner.commitTransaction();

      return originBoardPhotosUrl;
    }
    await queryRunner.commitTransaction();
  }

  async readUserBoard(
    userNo: number,
    take: number,
    page: number,
    target: boolean,
  ): Promise<Board[]> {
    try {
      const profileBoards: Board[] = await this.boardRepository.readUserBoard(
        userNo,
        take,
        page,
        target,
      );
      return profileBoards;
    } catch (err) {
      throw err;
    }
  }

  async findOneCategory(
    no: number,
    paginationDto: PaginationDto,
  ): Promise<Board[] | Board> {
    try {
      const categoryConfirm: Category = await this.categoryRepository.findOne(
        no,
      );

      if (!categoryConfirm) {
        throw new NotFoundException(`${no}번의 카테고리는 존재하지 않습니다.`);
      }
      if (no === 1) {
        const boards: Board[] = await this.boardRepository.getAllBoards(
          paginationDto,
        );

        return boards;
      }
      const boards: Board[] | Board =
        await this.boardRepository.findOneCategory(no, paginationDto);

      return boards;
    } catch (err) {
      throw err;
    }
  }
}
