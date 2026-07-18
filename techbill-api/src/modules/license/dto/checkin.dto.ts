import { IsString, IsNotEmpty, MaxLength, IsUUID } from 'class-validator';

export class CheckinDto {
  /** The server-side License record UUID (not the human-readable license key) */
  @IsUUID()
  @IsNotEmpty()
  licenseId: string;

  /** Device machine hash (same value used at activation). */
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  machineHash: string;

  /** Current app version, e.g. "1.0.3" */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  appVersion: string;
}
