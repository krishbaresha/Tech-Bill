import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CheckinDto {
  /** Human-readable license key identifying this installation. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  licenseKey: string;

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
