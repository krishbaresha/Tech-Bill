import {
  IsUUID,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  IsInt,
  IsPositive,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PoItemDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @IsPositive()
  quantityOrdered: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitCostPrice: number;
}

export class CreatePoDto {
  @IsUUID()
  @IsOptional()
  supplierId?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PoItemDto)
  items: PoItemDto[];
}
