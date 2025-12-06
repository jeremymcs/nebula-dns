import { 
  IsString, 
  IsNotEmpty, 
  IsIn, 
  IsOptional, 
  IsArray, 
  IsEmail, 
  IsBoolean,
  IsNumber,
  Min,
  Max,
  ValidateNested,
  ArrayMinSize
} from 'class-validator';
import { Type } from 'class-transformer';

class ReportFiltersDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  locationIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categories?: string[];

  @IsString()
  @IsIn(['last_day', 'last_week', 'last_month'])
  @IsOptional()
  dateRangeType?: 'last_day' | 'last_week' | 'last_month';
}

export class CreateScheduledReportDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsIn(['summary', 'threats', 'top_blocked', 'activity', 'compliance'])
  reportType: 'summary' | 'threats' | 'top_blocked' | 'activity' | 'compliance';

  @IsString()
  @IsIn(['daily', 'weekly', 'monthly'])
  scheduleType: 'daily' | 'weekly' | 'monthly';

  @IsNumber()
  @Min(0)
  @Max(31)
  @IsOptional()
  scheduleDay?: number;

  @IsString()
  @IsOptional()
  scheduleTime?: string; // HH:MM format

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsArray()
  @IsEmail({}, { each: true })
  @ArrayMinSize(1)
  recipients: string[];

  @ValidateNested()
  @Type(() => ReportFiltersDto)
  @IsOptional()
  filters?: ReportFiltersDto;

  @IsString()
  @IsIn(['pdf', 'csv', 'html'])
  @IsOptional()
  format?: 'pdf' | 'csv' | 'html';
}

export class UpdateScheduledReportDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsIn(['daily', 'weekly', 'monthly'])
  @IsOptional()
  scheduleType?: 'daily' | 'weekly' | 'monthly';

  @IsNumber()
  @Min(0)
  @Max(31)
  @IsOptional()
  scheduleDay?: number;

  @IsString()
  @IsOptional()
  scheduleTime?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsArray()
  @IsEmail({}, { each: true })
  @IsOptional()
  recipients?: string[];

  @ValidateNested()
  @Type(() => ReportFiltersDto)
  @IsOptional()
  filters?: ReportFiltersDto;

  @IsString()
  @IsIn(['pdf', 'csv', 'html'])
  @IsOptional()
  format?: 'pdf' | 'csv' | 'html';

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;
}
