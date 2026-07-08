import {
  IsString,
  IsUUID,
  IsOptional,
  IsNumber,
  IsPositive,
  IsEnum,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UnitCondition } from '@prisma/client';

export class CreateUnitDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  serialNumber: string;

  @IsUUID()
  productId: string;

  @IsEnum(UnitCondition)
  @IsOptional()
  condition?: UnitCondition;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  purchasePrice?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsUUID()
  @IsOptional()
  grnId?: string;
}
