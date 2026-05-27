import { IsUUID } from 'class-validator';

export class RequestOtpDto {
  @IsUUID()
  userId: string;
}
