import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserRepository } from 'src/auth/repository/user.repository';
import { SpecRepository } from './repository/spec.repository';

@Injectable()
export class SpecsService {
  constructor(
    @InjectRepository(SpecRepository)
    private specRepository: SpecRepository,
    private userRepository: UserRepository,
  ) {}

  async registSpec(createSpecDto) {
    try {
      const { title, description, photo_url, userNo } = createSpecDto;
      const user = await this.userRepository.findOne(userNo, {
        relations: ['specs'],
      });
      if (user) {
        const isRegist = await this.specRepository.registSpec(
          title,
          description,
          photo_url,
        );
        console.log(isRegist);
        // const spec = await this.specRepository.getSpecNo()

        //   if (isRegist) {
        //     user.specs.push()
        //   }
        return new UnauthorizedException(
          `${userNo}에 해당하는 유저가 존재하지 않습니다.`,
        );
      }
    } catch (err) {
      throw err;
    }
  }
}
