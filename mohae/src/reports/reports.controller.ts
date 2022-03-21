import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateReportDto } from './dto/create-report.dto';
import {
  ReportCheckBox,
  ReportedBoard,
  ReportedUser,
} from './entity/report.entity';
import { ReportsService } from './reports.service';

@Controller('reports')
@ApiTags('Reports')
export class ReportsController {
  private logger = new Logger('ReportsController');
  constructor(private reportsService: ReportsService) {}

  @Get('checkboxes')
  async findAllCheckBox(): Promise<ReportCheckBox[]> {
    const response = await this.reportsService.findAllCheckbox();

    return Object.assign({
      statusCode: 200,
      msg: `체크 항목별 조회되었습니다.`,
      response,
    });
  }

  @Get('/board/:no')
  async findOneBoardReport(@Param('no') no: number): Promise<ReportedBoard> {
    const response = await this.reportsService.findOneReportBoard(no);
    this.logger.verbose(
      `Reported list(board) has been received. Report Payload: ${JSON.stringify(
        response,
      )}`,
    );

    return Object.assign({
      statusCode: 200,
      msg: `No:${no} 신고 내역(게시글)이 조회되었습니다.`,
      response,
    });
  }

  @Get('/user/:no')
  findOneUserReport(@Param('no') no: number): Promise<ReportedUser> {
    return this.reportsService.findOneReportUser(no);
  }

  @Post()
  @UsePipes(ValidationPipe)
  async createReport(@Body() createReportDto: CreateReportDto) {
    const response = await this.reportsService.createReport(createReportDto);

    return Object.assign({
      statusCode: 201,
      msg: `${createReportDto.head} 신고가 접수되었습니다.`,
      response,
    });
  }

  // @Post('/board/:no')
  // @UsePipes(ValidationPipe)
  // async createBoardReport(
  //   @Param('no', ParseIntPipe) no: number,
  //   @Body() createReportDto: CreateReportDto,
  // ) {
  //   this.logger.verbose(
  //     `Board report has been received. Reported board Payload: ${JSON.stringify(
  //       createReportDto,
  //     )}`,
  //   );
  //   const response = await this.reportsService.createBoardReport(
  //     no,
  //     createReportDto,
  //   );

  //   return Object.assign({
  //     statusCode: 201,
  //     msg: '게시글 신고가 접수되었습니다.',
  //     response,
  //   });
  // }

  // @Post('/user')
  // @UsePipes(ValidationPipe)
  // createUserReport(@Body() createReportUserDto: CreateReportDto) {
  //   this.logger.verbose(
  //     `User report has been received. Reported user Payload: ${JSON.stringify(
  //       createReportUserDto,
  //     )}`,
  //   );
  //   const response = this.reportsService.createUserReport(createReportUserDto);

  //   return response;
  // }
}
