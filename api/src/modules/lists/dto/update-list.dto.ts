import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateListDto } from './create-list.dto';

export class UpdateListDto extends PartialType(
  OmitType(CreateListDto, ['type'] as const),
) {}
