// import { User } from 'src/auth/entity/user.entity';
import { User } from 'src/auth/entity/user.entity';
import {
  BaseEntity,
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('schools')
export class School extends BaseEntity {
  @PrimaryGeneratedColumn()
  no: number;

  @Column({
    type: 'varchar',
    length: 15,
    comment: '학교 이름',
  })
  name: string;

  @OneToMany((type) => User, (user) => user.school)
  users: User[];
}
