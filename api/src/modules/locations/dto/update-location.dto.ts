import { PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateLocationDto } from './create-location.dto';
import { LocationStatus } from '../entities/location.entity';

export class UpdateLocationDto extends PartialType(CreateLocationDto) {
  @ApiPropertyOptional({ enum: ['active', 'inactive'] })
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: LocationStatus;
}
