import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class ActivateLicenseDto {
  /** Human-readable license key, e.g. TB-DSK-8K32-QPL2-ZW91 */
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  licenseKey: string;

  /**
   * SHA-256 of (disk serial number + primary MAC address + motherboard serial).
   * Computed by the Rust LicenseService in the desktop app.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  machineHash: string;

  /** Raw hardware identifier string (for audit / support purposes). */
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  hardwareId: string;

  /** OS string, e.g. "Windows 11 Pro 23H2" */
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  os: string;

  /** Semver app version, e.g. "1.0.0" */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  appVersion: string;

  /** Human-readable device name, e.g. "Ahmed's Shop PC" */
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  deviceName: string;
}
