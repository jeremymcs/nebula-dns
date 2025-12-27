import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';
import { ListType } from '../entities/custom-list.entity';

export class ListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['allowlist', 'blocklist'], description: 'Filter by list type' })
  @IsOptional()
  @IsEnum(['allowlist', 'blocklist'])
  type?: ListType;
}

