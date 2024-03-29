import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ReportCheckboxRepository } from './repository/report-checkbox.repository';

@Injectable()
export class ReportCheckboxesService {
  constructor(
    @InjectRepository(ReportCheckboxRepository)
    private readonly reportCheckboxRepository: ReportCheckboxRepository,
  ) {}
}
