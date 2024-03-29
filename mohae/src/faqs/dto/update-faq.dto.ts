import { PickType } from '@nestjs/swagger';
import { Faq } from '../entity/faq.entity';

export class UpdateFaqDto extends PickType(Faq, [
  'title',
  'description',
] as const) {}
