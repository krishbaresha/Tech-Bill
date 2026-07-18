import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DesktopPlan, LicenseStatus, DeviceStatus, Role } from '@prisma/client';
import * as ed from '@noble/ed25519';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateLicenseDto,
  RenewLicenseDto,
  SetUserPermissionsDto,
} from './dto/create-license.dto';
import { ActivateLicenseDto } from './dto/activate-license.dto';
import { CheckinDto } from './dto/checkin.dto';

const BCRYPT_ROUNDS = 12;

/** Device limits per plan (matches LICENSE_SYSTEM.md §2). */
const PLAN_DEVICE_LIMITS: Record<DesktopPlan, number> = {
  BASIC: 1,
  PREMIUM: 3,
  ENTERPRISE: 999_999, // effectively unlimited
};

/** Human-readable key prefix per license type. */
const KEY_PREFIX: Record<string, string> = {
  DESKTOP: 'TB-DSK',
  MOBILE: 'TB-MOB',
};

@Injectable()
export class LicenseService {
  private privateKeyBytes: Uint8Array;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const key = this.config.get<string>('LICENSE_SIGNING_PRIVATE_KEY');
    if (!key) {
      throw new Error(
        'LICENSE_SIGNING_PRIVATE_KEY is not set in environment variables. ' +
          "Generate a 32-byte hex key with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
      );
    }
    this.privateKeyBytes = ed.etc.hexToBytes(key);
  }

  // ─── Key generation helpers ──────────────────────────────────────────────────

  /** Generate a random human-readable license key, e.g. TB-DSK-8K32-QPL2-ZW91 */
  private generateLicenseKey(type: string): string {
    const prefix = KEY_PREFIX[type] ?? 'TB-UNK';
    const segment = (): string =>
      Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${segment()}-${segment()}-${segment()}`;
  }

  /** Sign a JSON payload and return a dot-separated base64url bundle `TB-PRO-<payload>.<sig>`. */
  private async signPayload(payload: Record<string, unknown>): Promise<string> {
    const json = Buffer.from(JSON.stringify(payload), 'utf8');
    const signature = await ed.signAsync(json, this.privateKeyBytes);
    return `TB-PRO-${json.toString('base64url')}.${Buffer.from(signature).toString('base64url')}`;
  }

  // ─── Super Admin: license CRUD ───────────────────────────────────────────────

  async createLicense(dto: CreateLicenseDto, issuedBy: string) {
    // Per-shop, not per-user (2026-07-17): a license is issued against the
    // tenant, so it no longer matters whether the specific "issued for" user
    // has their own desktopAccess/mobileAccess toggle on — that per-user
    // toggle is a UI-only preference now, not an issuance gate. Dropping this
    // check makes createLicense consistent with activateLicense/checkin,
    // which already stopped enforcing it.
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });
    if (!user) throw new NotFoundException('User not found');

    const tenantId = user.tenantId;
    if (!tenantId) {
      throw new BadRequestException(
        'Selected user does not belong to any tenant',
      );
    }

    const maxDevices = PLAN_DEVICE_LIMITS[dto.plan];
    const expiresAt = new Date(dto.expiresAt);

    // Generate a unique human-readable key (retry on collision, max 5 attempts)
    let licenseKey = '';
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = this.generateLicenseKey(dto.licenseType);
      const existing = await this.prisma.license.findUnique({
        where: { licenseKey: candidate },
      });
      if (!existing) {
        licenseKey = candidate;
        break;
      }
      if (attempt === 4) {
        throw new ConflictException(
          'Could not generate a unique license key — try again',
        );
      }
    }

    const licenseId = randomUUID();
    const payload = {
      license_id: licenseId,
      tenant_id: tenantId,
      plan_id: dto.plan,
      issued_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    };
    const signedToken = await this.signPayload(payload);

    return this.prisma.license.create({
      data: {
        id: licenseId,
        tenantId,
        userId: dto.userId,
        issuedBy,
        licenseKey,
        licenseType: dto.licenseType,
        plan: dto.plan,
        status: LicenseStatus.ACTIVE,
        expiresAt,
        maxDevices,
        signedToken,
      },
      select: {
        id: true,
        licenseKey: true,
        licenseType: true,
        plan: true,
        status: true,
        expiresAt: true,
        maxDevices: true,
        createdAt: true,
      },
    });
  }

  async regenerateLicense(id: string, issuedBy: string) {
    const license = await this.prisma.license.findUnique({ where: { id } });
    if (!license) throw new NotFoundException('License not found');

    let licenseKey = '';
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = this.generateLicenseKey(license.licenseType);
      const existing = await this.prisma.license.findUnique({
        where: { licenseKey: candidate },
      });
      if (!existing) {
        licenseKey = candidate;
        break;
      }
      if (attempt === 4) {
        throw new ConflictException('Could not generate a unique license key');
      }
    }

    const payload = {
      license_id: license.id,
      tenant_id: license.tenantId,
      plan_id: license.plan,
      issued_at: new Date().toISOString(),
      expires_at: license.expiresAt.toISOString(),
    };
    const signedToken = await this.signPayload(payload);

    return this.prisma.license.update({
      where: { id },
      data: { licenseKey, signedToken, issuedBy, status: LicenseStatus.ACTIVE },
      select: {
        id: true,
        licenseKey: true,
        plan: true,
        status: true,
        expiresAt: true,
      },
    });
  }

  async renewLicense(id: string, dto: RenewLicenseDto, issuedBy: string) {
    const license = await this.prisma.license.findUnique({ where: { id } });
    if (!license) throw new NotFoundException('License not found');

    const expiresAt = new Date(dto.expiresAt);

    const payload = {
      license_id: license.id,
      tenant_id: license.tenantId,
      plan_id: license.plan,
      issued_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    };
    const signedToken = await this.signPayload(payload);

    return this.prisma.license.update({
      where: { id },
      data: { expiresAt, signedToken, issuedBy, status: LicenseStatus.ACTIVE },
      select: {
        id: true,
        licenseKey: true,
        plan: true,
        status: true,
        expiresAt: true,
      },
    });
  }

  async revokeLicense(id: string) {
    await this.findLicenseOrThrow(id);
    return this.prisma.license.update({
      where: { id },
      data: { status: LicenseStatus.REVOKED },
      select: { id: true, status: true },
    });
  }

  async suspendLicense(id: string) {
    await this.findLicenseOrThrow(id);
    return this.prisma.license.update({
      where: { id },
      data: { status: LicenseStatus.SUSPENDED },
      select: { id: true, status: true },
    });
  }

  async listLicenses(userId?: string, tenantId?: string) {
    return this.prisma.license.findMany({
      where: {
        ...(userId && { userId }),
        ...(tenantId && { tenantId }),
      },
      select: {
        id: true,
        tenantId: true,
        licenseKey: true,
        licenseType: true,
        plan: true,
        status: true,
        expiresAt: true,
        maxDevices: true,
        signedToken: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { devices: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        tenantId: true,
        tenant: {
          select: {
            name: true,
            slug: true,
          },
        },
        userPermission: {
          select: {
            webAccess: true,
            desktopAccess: true,
            mobileAccess: true,
          },
        },
        licenses: {
          select: {
            id: true,
            licenseKey: true,
            licenseType: true,
            plan: true,
            status: true,
            expiresAt: true,
          },
        },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Desktop client endpoints ────────────────────────────────────────────────

  async activateLicense(dto: ActivateLicenseDto) {
    const license = await this.prisma.license.findUnique({
      where: { licenseKey: dto.licenseKey },
      include: {
        user: true,
        tenant: { select: { desktopAccessEnabled: true } },
        devices: { where: { status: DeviceStatus.ACTIVE } },
      },
    });

    if (!license) throw new NotFoundException('License key not found');

    if (!license.tenant.desktopAccessEnabled) {
      throw new ForbiddenException(
        'Desktop access has been disabled for this shop by the platform admin.',
      );
    }

    if (license.status !== LicenseStatus.ACTIVE) {
      throw new ForbiddenException(
        `License is ${license.status.toLowerCase()} and cannot be activated`,
      );
    }

    if (new Date() > license.expiresAt) {
      throw new ForbiddenException('License has expired');
    }

    // Per-shop, not per-user (2026-07-17): any staff member at this
    // license's shop may activate it — there is no per-user gate here
    // anymore. The device-limit check below is the real enforcement
    // (already correctly per-License, i.e. per-shop).
    const existingDevice = license.devices.find(
      (d) => d.machineHash === dto.machineHash,
    );

    if (!existingDevice) {
      if (license.devices.length >= license.maxDevices) {
        throw new ForbiddenException(
          `Device limit reached (${license.maxDevices} device${license.maxDevices === 1 ? '' : 's'} ` +
            `allowed on the ${license.plan} plan). Ask your admin to remove an old device first.`,
        );
      }

      await this.prisma.device.create({
        data: {
          licenseId: license.id,
          userId: license.userId,
          deviceName: dto.deviceName,
          deviceType: 'desktop',
          os: dto.os,
          machineHash: dto.machineHash,
          hardwareId: dto.hardwareId,
          appVersion: dto.appVersion,
          lastLoginAt: new Date(),
        },
      });
    } else {
      await this.prisma.device.update({
        where: { id: existingDevice.id },
        data: { lastLoginAt: new Date(), appVersion: dto.appVersion },
      });
    }

    await this.prisma.license.update({
      where: { id: license.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      signedToken: license.signedToken,
      licenseType: license.licenseType,
      plan: license.plan,
      expiresAt: license.expiresAt,
      status: license.status,
      user: {
        id: license.user.id,
        name: license.user.name,
        email: license.user.email,
        tenantId: license.user.tenantId,
      },
    };
  }

  async checkin(dto: CheckinDto, callerTenantId: string, callerUserId: string) {
    const license = await this.prisma.license.findUnique({
      where: { id: dto.licenseId },
      include: {
        tenant: { select: { desktopAccessEnabled: true } },
        devices: { where: { status: DeviceStatus.ACTIVE } },
      },
    });
    if (!license) throw new UnauthorizedException('License not found');

    // Security check: The license must belong to the caller's tenant/shop!
    if (license.tenantId !== callerTenantId) {
      throw new ForbiddenException('License does not belong to your shop');
    }

    // desktopAccessEnabled is a soft, tenant-level kill-switch: unlike the
    // license's own status/expiry it doesn't get persisted onto the
    // license row, it's just echoed back so the client can flip to
    // read-only immediately rather than waiting out its offline-staleness
    // grace window.
    const desktopAccessEnabled = license.tenant.desktopAccessEnabled;

    if (license.status === LicenseStatus.REVOKED) {
      return {
        status: LicenseStatus.REVOKED,
        expiresAt: license.expiresAt,
        serverTime: new Date().toISOString(),
        serverTimestamp: new Date().toISOString(),
        signedToken: license.signedToken,
        desktopAccessEnabled,
      };
    }

    if (new Date() > license.expiresAt) {
      if (license.status !== LicenseStatus.EXPIRED) {
        await this.prisma.license.update({
          where: { id: license.id },
          data: { status: LicenseStatus.EXPIRED },
        });
      }
      return {
        status: LicenseStatus.EXPIRED,
        expiresAt: license.expiresAt,
        serverTime: new Date().toISOString(),
        serverTimestamp: new Date().toISOString(),
        signedToken: license.signedToken,
        desktopAccessEnabled,
      };
    }

    // Check device registrations
    const existingDevice = license.devices.find(
      (d) => d.machineHash === dto.machineHash,
    );

    if (!existingDevice) {
      if (license.devices.length >= license.maxDevices) {
        throw new ForbiddenException(
          `Device limit reached (${license.maxDevices} device${license.maxDevices === 1 ? '' : 's'} ` +
            `allowed on the ${license.plan} plan). Ask your admin to remove an old device first.`,
        );
      }

      await this.prisma.device.create({
        data: {
          licenseId: license.id,
          userId: callerUserId,
          deviceName: 'Desktop Client',
          deviceType: 'desktop',
          os: 'Windows',
          machineHash: dto.machineHash,
          hardwareId: dto.machineHash,
          appVersion: dto.appVersion,
          lastLoginAt: new Date(),
          lastCheckinAt: new Date(),
        },
      });
    } else {
      await this.prisma.device.update({
        where: { id: existingDevice.id },
        data: { lastCheckinAt: new Date(), appVersion: dto.appVersion },
      });
    }

    await this.prisma.license.update({
      where: { id: license.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      status: license.status,
      expiresAt: license.expiresAt,
      serverTime: new Date().toISOString(),
      serverTimestamp: new Date().toISOString(),
      signedToken: license.signedToken,
      desktopAccessEnabled,
    };
  }

  // ─── User permissions ────────────────────────────────────────────────────────

  async setUserPermissions(userId: string, dto: SetUserPermissionsDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.userPermission.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: { ...dto },
      select: {
        userId: true,
        webAccess: true,
        desktopAccess: true,
        mobileAccess: true,
        updatedAt: true,
      },
    });
  }

  async getUserPermissions(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userPermission: true },
    });
    if (!user) throw new NotFoundException('User not found');

    return (
      user.userPermission ?? {
        userId,
        webAccess: true,
        desktopAccess: false,
        mobileAccess: false,
      }
    );
  }

  async adminCreateUser(dto: {
    name: string;
    username: string;
    password: string;
    role: Role;
    tenantId: string;
    permissions?: string[];
  }) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: dto.tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const email = `${dto.username}@${tenant.slug}.techbill.app`;

    const existing = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existing) throw new ConflictException(`Email ${email} already in use`);

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    return this.prisma.user.create({
      data: {
        name: dto.name,
        email,
        passwordHash,
        role: dto.role,
        tenantId: dto.tenantId,
        isActive: true,
        permissions: dto.permissions || [],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        permissions: true,
        createdAt: true,
      },
    });
  }

  async adminUpdateUser(
    id: string,
    dto: {
      name?: string;
      role?: Role;
      isActive?: boolean;
      permissions?: string[];
      password?: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.permissions !== undefined) data.permissions = dto.permissions;
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        permissions: true,
      },
    });
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private async findLicenseOrThrow(id: string) {
    const license = await this.prisma.license.findUnique({ where: { id } });
    if (!license) throw new NotFoundException(`License ${id} not found`);
    return license;
  }
}
