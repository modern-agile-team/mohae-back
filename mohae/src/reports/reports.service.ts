import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/auth/entity/user.entity';
import { UserRepository } from 'src/auth/repository/user.repository';
import { Board } from 'src/boards/entity/board.entity';
import { BoardRepository } from 'src/boards/repository/board.repository';
import { ErrorConfirm } from 'src/common/utils/error';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportCheckbox } from '../report-checkboxes/entity/report-checkboxes.entity';
import { ReportCheckboxRepository } from '../report-checkboxes/repository/report-checkbox.repository';
import {
  BoardReportChecksRepository,
  UserReportChecksRepository,
} from '../report-checks/repository/report-checks.repository';
import { ReportedBoardRepository } from './repository/reported-board.repository';
import { ReportedUserRepository } from './repository/reported-user.repository';
import { ReportedBoard } from './entity/reported-board.entity';
import { ReportedUser } from './entity/reported-user.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(ReportedBoardRepository)
    private reportedBoardRepository: ReportedBoardRepository,

    @InjectRepository(ReportedUserRepository)
    private reportedUserRepository: ReportedUserRepository,

    @InjectRepository(ReportCheckboxRepository)
    private reportCheckboxRepository: ReportCheckboxRepository,

    @InjectRepository(BoardRepository)
    private boardRepository: BoardRepository,

    @InjectRepository(UserRepository)
    private userRepository: UserRepository,

    @InjectRepository(BoardReportChecksRepository)
    private boardReportChecksRepository: BoardReportChecksRepository,

    @InjectRepository(UserReportChecksRepository)
    private userReportChecksRepository: UserReportChecksRepository,

    private errorConfirm: ErrorConfirm,
  ) {}

  async readOneReportedBoard(boardNo: number): Promise<ReportedBoard> {
    try {
      const reportedBoard: ReportedBoard =
        await this.reportedBoardRepository.readOneReportedBoard(boardNo);

      this.errorConfirm.notFoundError(
        reportedBoard,
        '해당 게시글 신고를 찾을 수 없습니다.',
      );

      return reportedBoard;
    } catch (err) {
      throw err;
    }
  }

  async readOneReportedUser(userNo: number): Promise<ReportedUser> {
    try {
      const reportedUser: ReportedUser =
        await this.reportedUserRepository.readOneReportedUser(userNo);

      this.errorConfirm.notFoundError(
        reportedUser,
        '해당 유저 신고를 찾을 수 없습니다.',
      );

      return reportedUser;
    } catch (err) {
      throw err;
    }
  }

  async createReport(createReportDto: CreateReportDto) {
    const { head, headNo, reportUserNo, checks, description }: CreateReportDto =
      createReportDto;
    const uniqueCheck: Array<number> = checks.filter((el, i) => {
      return checks.indexOf(el) === i;
    });
    const checkInfo: Promise<ReportCheckbox>[] = uniqueCheck.map(async (el) => {
      return await this.reportCheckboxRepository.selectCheckConfirm(el);
    });

    try {
      switch (head) {
        // 게시글 신고일 때의 로직
        case 'board':
          const board: Board = await this.boardRepository.findOne(headNo, {
            select: ['no'],
            relations: ['reports'],
          });
          this.errorConfirm.notFoundError(
            board,
            '신고하려는 게시글이 존재하지 않습니다.',
          );
          const boardReporter: User = await this.userRepository.findOne(
            reportUserNo,
            {
              select: ['no'],
              relations: ['boardReport'],
            },
          );
          this.errorConfirm.notFoundError(
            boardReporter,
            '신고자를 찾을 수 없습니다.',
          );

          const createBoardReportResult =
            await this.reportedBoardRepository.createBoardReport(description);
          if (!createBoardReportResult.affectedRows) {
            throw new InternalServerErrorException('게시글 신고 저장 실패');
          }
          const newBoardReport: ReportedBoard =
            await this.reportedBoardRepository.readOneReportedBoard(
              createBoardReportResult.insertId,
            );

          checkInfo.forEach(async (checkNo) => {
            await this.boardReportChecksRepository.saveBoardReportChecks(
              newBoardReport,
              await checkNo,
            );
          });

          board.reports.push(newBoardReport);
          await this.boardRepository.save(board);
          await this.userRepository.userRelation(
            boardReporter.no,
            newBoardReport,
            'boardReport',
          );

          return {
            success: true,
            reportNo: createBoardReportResult.insertId,
          };
        // 유저 신고일 때의 로직
        case 'user':
          const user: User = await this.userRepository.findOne(headNo, {
            select: ['no'],
            relations: ['reports'],
          });
          this.errorConfirm.notFoundError(
            user,
            '신고하려는 유저가 존재하지 않습니다.',
          );

          const userReporter: User = await this.userRepository.findOne(
            reportUserNo,
            {
              select: ['no'],
              relations: ['userReport'],
            },
          );
          this.errorConfirm.notFoundError(
            userReporter,
            '신고자를 찾을 수 없습니다.',
          );

          const createUserReportResult =
            await this.reportedUserRepository.createUserReport(description);
          if (!createUserReportResult.affectedRows) {
            throw new InternalServerErrorException(
              '유저 신고가 접수되지 않았습니다.',
            );
          }
          const newUserReport: ReportedUser =
            await this.reportedUserRepository.readOneReportedUser(
              createUserReportResult.insertId,
            );

          checkInfo.forEach(async (checkNo) => {
            await this.userReportChecksRepository.saveUserReportChecks(
              newUserReport,
              await checkNo,
            );
          });

          await this.userRepository.userRelation(
            user.no,
            newUserReport,
            'reports',
          );
          await this.userRepository.userRelation(
            userReporter.no,
            newUserReport,
            'userReport',
          );

          return {
            success: true,
            reportNo: createUserReportResult.insertId,
          };
        default:
          this.errorConfirm.notFoundError('', '해당 경로를 찾을 수 없습니다.');
      }
    } catch (e) {
      throw e;
    }
  }
}
