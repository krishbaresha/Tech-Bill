import {
  IsString,
  IsArray,
  ArrayMinSize,
  IsEnum,
  MinLength,
} from 'class-validator';
import { ReturnType } from '@prisma/client';

export class CreateReturnDto {
  @IsString()
  saleId: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  serialNumbers: string[];

  @IsString()
  @MinLength(5)
  reason: string;

  @IsEnum(ReturnType)
  returnType: ReturnType;
}
