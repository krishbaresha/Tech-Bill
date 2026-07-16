import {
  IsEnum,
  IsString,
  IsUUID,
  IsDateString,
  IsOptional,
} from 'class-validator';
import { LicenseType, DesktopPlan } from '@prisma/client';

export class CreateLicenseDto {
  @IsUUID()
  userId: string;

  @IsEnum(LicenseType)
  licenseType: LicenseType;

  @IsEnum(DesktopPlan)
  plan: DesktopPlan;

  /**
   * ISO-8601 date string for expiry. Use a far-future date for "Lifetime"
   * (e.g. 2125-01-01T00:00:00.000Z) — kept as a real date so offline
   * verification logic has one unified code path.
   */
  @IsDateString()
  expiresAt: string;

  /** Optional human-readable device name for the first device (used on activation). */
  @IsOptional()
  @IsString()
  deviceName?: string;
}

export class RenewLicenseDto {
  /** New expiry date — extends the existing license without changing the key. */
  @IsDateString()
  expiresAt: string;
}

export class SetUserPermissionsDto {
  webAccess: boolean;
  desktopAccess: boolean;
  mobileAccess: boolean;
}
