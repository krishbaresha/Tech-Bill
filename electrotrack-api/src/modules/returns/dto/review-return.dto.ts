import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class ReviewReturnDto {
  @IsString()
  @IsOptional()
  reviewNotes?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  refundAmount?: number;
}
