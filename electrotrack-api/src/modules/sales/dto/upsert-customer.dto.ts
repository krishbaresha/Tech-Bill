import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpsertCustomerDto {
  @IsString()
  @MinLength(7)
  phone: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  @IsOptional()
  email?: string;
}
