import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { UnitCondition, UnitStatus } from '@prisma/client';

export class FilterUnitsDto {
  @IsEnum(UnitStatus)
  @IsOptional()
  status?: UnitStatus;

  @IsUUID()
  @IsOptional()
  productId?: string;

  @IsEnum(UnitCondition)
  @IsOptional()
  condition?: UnitCondition;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 50;
}
