import { User } from 'src/auth/entity/user.entity';
import { BaseEntity, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity('user_like')
export class UserLike extends BaseEntity {
  @PrimaryGeneratedColumn()
  no: number;

  // 좋아요를 누른 유저
  @ManyToOne((type) => User, (user) => user.likedUser, {
    onDelete: 'CASCADE',
  })
  likedMe: User;

  // 좋아요를 받은 유저
  @ManyToOne((type) => User, (user) => user.likedMe, {
    onDelete: 'CASCADE',
  })
  likedUser: User;
}
