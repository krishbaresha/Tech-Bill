import {
  IsString,
  IsOptional,
  IsNumber,
  IsPositive,
  MinLength,
  Min,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  sellingPrice: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  costPrice?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  warrantyMonths?: number;
}
