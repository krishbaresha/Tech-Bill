import { IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateUnitDto } from './create-unit.dto';

export class BulkCreateUnitsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateUnitDto)
  units: CreateUnitDto[];
}
