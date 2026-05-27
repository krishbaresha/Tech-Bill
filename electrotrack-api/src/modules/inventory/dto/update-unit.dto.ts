import { IsEnum, IsOptional, IsString } from 'class-validator';
import { UnitCondition, UnitStatus } from '@prisma/client';

export class UpdateUnitDto {
  @IsEnum(UnitCondition)
  @IsOptional()
  condition?: UnitCondition;

  @IsEnum(UnitStatus)
  @IsOptional()
  status?: UnitStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}
