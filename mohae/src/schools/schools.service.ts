import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/auth/entity/user.entity';
import { UserRepository } from 'src/auth/repository/user.repository';
import { School } from './entity/school.entity';
import { SchoolRepository } from './repository/school.repository';

@Injectable()
export class SchoolsService {
  constructor(
    @InjectRepository(SchoolRepository)
    private schoolRepository: SchoolRepository,
  ) // private userRepository: UserRepository,
  {}
  async findOne(no: number): Promise<School> {
    return await this.schoolRepository.findOne(no);
  }
}
