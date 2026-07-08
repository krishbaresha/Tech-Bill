import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class ReconciliationDto {
  @IsDateString()
  date: string;

  @IsNumber()
  @Min(0)
  openingBalance: number;

  @IsNumber()
  @Min(0)
  actualCash: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
