import { IsString, MinLength } from 'class-validator';

export class VoidSaleDto {
  @IsString()
  @MinLength(5)
  reason: string;
}
