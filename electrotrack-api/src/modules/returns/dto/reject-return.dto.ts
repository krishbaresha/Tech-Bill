import { IsOptional, IsString } from 'class-validator';

export class RejectReturnDto {
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
