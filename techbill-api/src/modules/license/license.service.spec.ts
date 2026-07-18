import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LicenseService } from './license.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LicenseStatus, DeviceStatus, LicenseType, DesktopPlan } from '@prisma/client';

// ─── Minimal Prisma mock ─────────────────────────────────────────────────────

const mockUser = {
  id: 'user-uuid-1',
  name: 'Test User',
  email: 'test@example.com',
  passwordHash: 'hashed',
  role: 'owner',
  isActive: true,
  tenantId: 'tenant-uuid-1',
  permissions: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  userPermission: {
    id: 'perm-uuid-1',
    userId: 'user-uuid-1',
    webAccess: true,
    desktopAccess: true,
    mobileAccess: false,
    updatedAt: new Date(),
  },
};

const mockDevice = {
  id: 'device-uuid-1',
  licenseId: 'lic-uuid-1',
  userId: 'user-uuid-1',
  deviceName: "Test Shop PC",
  deviceType: 'desktop',
  os: 'Windows 11',
  machineHash: 'abc123hash',
  hardwareId: 'hw-id-001',
  lastLoginAt: new Date(),
  lastCheckinAt: null,
  appVersion: '1.0.0',
  status: DeviceStatus.ACTIVE,
  createdAt: new Date(),
};

const mockLicense = {
  id: 'lic-uuid-1',
  tenantId: 'tenant-uuid-1',
  userId: 'user-uuid-1',
  user: mockUser,
  tenant: { desktopAccessEnabled: true },
  devices: [mockDevice],
  issuedBy: 'admin-uuid-1',
  licenseKey: 'TB-DSK-AAAA-BBBB-CCCC',
  licenseType: LicenseType.DESKTOP,
  plan: DesktopPlan.BASIC,
  status: LicenseStatus.ACTIVE,
  expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365), // 1 year ahead
  maxDevices: 1,
  signedToken: 'mocked-token',
  lastUsedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};


const prismaMock = {
  user: {
    findUnique: jest.fn().mockResolvedValue(mockUser),
    create: jest.fn().mockResolvedValue(mockUser),
    update: jest.fn().mockResolvedValue(mockUser),
    findMany: jest.fn().mockResolvedValue([mockUser]),
  },
  tenant: {
    findUnique: jest.fn().mockResolvedValue({ id: 'tenant-uuid-1', name: 'Test Shop', slug: 'testshop' }),
  },
  license: {
    findUnique: jest.fn().mockResolvedValue(mockLicense),
    findMany: jest.fn().mockResolvedValue([mockLicense]),
    create: jest.fn().mockResolvedValue(mockLicense),
    update: jest.fn().mockResolvedValue(mockLicense),
  },
  device: {
    findFirst: jest.fn().mockResolvedValue(mockDevice),
    create: jest.fn().mockResolvedValue(mockDevice),
    update: jest.fn().mockResolvedValue(mockDevice),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
  },
  userPermission: {
    upsert: jest.fn().mockResolvedValue({
      userId: 'user-uuid-1',
      webAccess: true,
      desktopAccess: true,
      mobileAccess: false,
      updatedAt: new Date(),
    }),
  },
};

const configMock = {
  get: jest.fn((key: string) => {
    if (key === 'LICENSE_SIGNING_PRIVATE_KEY') {
      // 32 random bytes as hex — valid Ed25519 private key for testing
      return 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3';
    }
    return undefined;
  }),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('LicenseService', () => {
  let service: LicenseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LicenseService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ConfigService, useValue: configMock },
      ],
    }).compile();

    service = module.get<LicenseService>(LicenseService);
    jest.clearAllMocks();
  });

  // ── createLicense ──────────────────────────────────────────────────────────

  describe('createLicense', () => {
    it('issues a new license when user has desktop access', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.license.findUnique.mockResolvedValue(null); // no collision
      prismaMock.license.create.mockResolvedValue(mockLicense);

      const result = await service.createLicense(
        {
          userId: 'user-uuid-1',
          licenseType: LicenseType.DESKTOP,
          plan: DesktopPlan.BASIC,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
        },
        'admin-uuid-1',
      );

      expect(prismaMock.license.create).toHaveBeenCalledTimes(1);
      expect(result.status).toBe(LicenseStatus.ACTIVE);
    });

    it('stores the license against the tenant, not just the issuing user (per-shop, 2026-07-17)', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.license.findUnique.mockResolvedValue(null);
      prismaMock.license.create.mockResolvedValue(mockLicense);

      await service.createLicense(
        {
          userId: 'user-uuid-1',
          licenseType: LicenseType.DESKTOP,
          plan: DesktopPlan.BASIC,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
        },
        'admin-uuid-1',
      );

      expect(prismaMock.license.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId: mockUser.tenantId }),
        }),
      );
    });

    it('issues a license even when the recipient has desktopAccess off (per-shop, 2026-07-17)', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...mockUser,
        userPermission: { ...mockUser.userPermission, desktopAccess: false },
      });
      prismaMock.license.findUnique.mockResolvedValue(null);
      prismaMock.license.create.mockResolvedValue(mockLicense);

      await expect(
        service.createLicense(
          {
            userId: 'user-uuid-1',
            licenseType: LicenseType.DESKTOP,
            plan: DesktopPlan.BASIC,
            expiresAt: new Date().toISOString(),
          },
          'admin-uuid-1',
        ),
      ).resolves.toEqual(mockLicense);
    });

    it('throws NotFoundException when user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createLicense(
          {
            userId: 'nonexistent',
            licenseType: LicenseType.DESKTOP,
            plan: DesktopPlan.BASIC,
            expiresAt: new Date().toISOString(),
          },
          'admin-uuid-1',
        ),
      ).rejects.toThrow('User not found');
    });
  });

  // ── revokeLicense ──────────────────────────────────────────────────────────

  describe('revokeLicense', () => {
    it('sets status to REVOKED', async () => {
      prismaMock.license.findUnique.mockResolvedValue(mockLicense);
      prismaMock.license.update.mockResolvedValue({
        id: 'lic-uuid-1',
        status: LicenseStatus.REVOKED,
      });

      const result = await service.revokeLicense('lic-uuid-1');
      expect(result.status).toBe(LicenseStatus.REVOKED);
    });

    it('throws NotFoundException for unknown license id', async () => {
      prismaMock.license.findUnique.mockResolvedValue(null);

      await expect(service.revokeLicense('bad-id')).rejects.toThrow(
        'bad-id',
      );
    });
  });

  // ── activateLicense ────────────────────────────────────────────────────────

  describe('activateLicense', () => {
    const activateDto = {
      licenseKey: 'TB-DSK-AAAA-BBBB-CCCC',
      machineHash: 'new-machine-hash',
      hardwareId: 'hw-002',
      os: 'Windows 11',
      appVersion: '1.0.0',
      deviceName: "New Shop PC",
    };

    it('registers a new device and returns signed token', async () => {
      // Return license with 0 active devices (so we can add one)
      prismaMock.license.findUnique.mockResolvedValue({
        ...mockLicense,
        user: mockUser,
        devices: [],
      });
      prismaMock.device.create.mockResolvedValue(mockDevice);
      prismaMock.license.update.mockResolvedValue(mockLicense);

      const result = await service.activateLicense(activateDto);

      expect(prismaMock.device.create).toHaveBeenCalledTimes(1);
      expect(result.signedToken).toBe('mocked-token');
    });

    it('activates even when the originally-issued-for user has desktop access disabled (per-shop, 2026-07-17)', async () => {
      // The bug being fixed: activation used to be gated on the specific
      // user the license was created for. It no longer is — any staff
      // member at the shop can activate, and the only real gate left is
      // the device limit (tested separately below). Proving this by
      // showing activation succeeds even when that user's own
      // desktopAccess flag is false, which would have thrown before.
      prismaMock.license.findUnique.mockResolvedValue({
        ...mockLicense,
        user: { ...mockUser, userPermission: { ...mockUser.userPermission, desktopAccess: false } },
        devices: [],
      });
      prismaMock.device.create.mockResolvedValue(mockDevice);
      prismaMock.license.update.mockResolvedValue(mockLicense);

      const result = await service.activateLicense(activateDto);

      expect(result.signedToken).toBe('mocked-token');
      expect(prismaMock.device.create).toHaveBeenCalledTimes(1);
    });

    it('blocks activation when device limit is reached', async () => {
      // BASIC plan = 1 device; already has 1 device with a different machineHash
      prismaMock.license.findUnique.mockResolvedValue({
        ...mockLicense, // maxDevices: 1
        user: mockUser,
        devices: [{ ...mockDevice, machineHash: 'different-hash' }],
      });

      await expect(service.activateLicense(activateDto)).rejects.toThrow(
        'Device limit reached',
      );
    });

    it('blocks activation when license is revoked', async () => {
      prismaMock.license.findUnique.mockResolvedValue({
        ...mockLicense,
        status: LicenseStatus.REVOKED,
        user: mockUser,
        devices: [],
      });

      await expect(service.activateLicense(activateDto)).rejects.toThrow(
        'revoked',
      );
    });

    it('blocks activation when license is expired', async () => {
      prismaMock.license.findUnique.mockResolvedValue({
        ...mockLicense,
        expiresAt: new Date(Date.now() - 1000), // in the past
        user: mockUser,
        devices: [],
      });

      await expect(service.activateLicense(activateDto)).rejects.toThrow(
        'expired',
      );
    });

    it('throws NotFoundException for unknown license key', async () => {
      prismaMock.license.findUnique.mockResolvedValue(null);

      await expect(service.activateLicense(activateDto)).rejects.toThrow(
        'License key not found',
      );
    });

    it('blocks activation when the shop has desktop access disabled (2026-07-17)', async () => {
      prismaMock.license.findUnique.mockResolvedValue({
        ...mockLicense,
        tenant: { desktopAccessEnabled: false },
        user: mockUser,
        devices: [],
      });

      await expect(service.activateLicense(activateDto)).rejects.toThrow(
        'Desktop access has been disabled',
      );
    });
  });

  // ── checkin ────────────────────────────────────────────────────────────────

  describe('checkin', () => {
    const checkinDto = {
      licenseId: 'lic-uuid-1',
      machineHash: 'abc123hash',
      appVersion: '1.0.1',
    };

    it('updates device checkin timestamp and returns current status', async () => {
      prismaMock.license.findUnique.mockResolvedValue(mockLicense);
      prismaMock.device.update.mockResolvedValue(mockDevice);
      prismaMock.license.update.mockResolvedValue(mockLicense);

      const result = await service.checkin(checkinDto, 'tenant-uuid-1', 'user-uuid-1');

      expect(result.status).toBe(LicenseStatus.ACTIVE);
      expect(result.serverTimestamp).toBeDefined();
      expect(result.signedToken).toBe('mocked-token');
    });

    it('accepts checkin from any staff member of the tenant, not just the issuing user (per-shop, 2026-07-17)', async () => {
      prismaMock.license.findUnique.mockResolvedValue(mockLicense);
      prismaMock.device.update.mockResolvedValue(mockDevice);
      prismaMock.license.update.mockResolvedValue(mockLicense);

      // callerUserId is a different user than mockLicense.userId
      // ('user-uuid-1') — same tenant, different staff member.
      const result = await service.checkin(checkinDto, 'tenant-uuid-1', 'user-uuid-2');

      expect(result.status).toBe(LicenseStatus.ACTIVE);
    });

    it('rejects checkin from a different tenant even with a valid device hash', async () => {
      prismaMock.license.findUnique.mockResolvedValue(mockLicense);

      await expect(
        service.checkin(checkinDto, 'some-other-tenant-uuid', 'user-uuid-1'),
      ).rejects.toThrow('does not belong to your shop');
    });

    it('rejects checkin if device limit is exceeded', async () => {
      const fullLicense = {
        ...mockLicense,
        devices: [mockDevice, { ...mockDevice, id: 'device-2', machineHash: 'other-hash' }],
        maxDevices: 1,
      };
      prismaMock.license.findUnique.mockResolvedValue(fullLicense);

      await expect(
        service.checkin({ ...checkinDto, machineHash: 'new-device-hash' }, 'tenant-uuid-1', 'user-uuid-1')
      ).rejects.toThrow('Device limit reached');
    });

    it('reports desktopAccessEnabled: false so the client can go read-only without waiting on staleness (2026-07-17)', async () => {
      prismaMock.license.findUnique.mockResolvedValue({
        ...mockLicense,
        tenant: { desktopAccessEnabled: false },
      });
      prismaMock.device.update.mockResolvedValue(mockDevice);
      prismaMock.license.update.mockResolvedValue(mockLicense);

      const result = await service.checkin(checkinDto, 'tenant-uuid-1', 'user-uuid-1');

      expect(result.desktopAccessEnabled).toBe(false);
      // Being disabled doesn't itself change the license's own ACTIVE status —
      // it's a separate signal the client combines with status to decide readOnly.
      expect(result.status).toBe(LicenseStatus.ACTIVE);
    });
  });

  // ── setUserPermissions ─────────────────────────────────────────────────────

  describe('setUserPermissions', () => {
    it('upserts user permission toggles', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.setUserPermissions('user-uuid-1', {
        webAccess: true,
        desktopAccess: true,
        mobileAccess: false,
      });

      expect(prismaMock.userPermission.upsert).toHaveBeenCalledTimes(1);
      expect(result.desktopAccess).toBe(true);
    });
  });

  // ── listAllUsers / adminCreateUser / adminUpdateUser ──────────────────────────

  describe('admin user administration', () => {
    it('lists all users across tenants', async () => {
      prismaMock.user.findMany.mockResolvedValue([mockUser]);
      const result = await service.listAllUsers();
      expect(prismaMock.user.findMany).toHaveBeenCalled();
      expect(result.length).toBe(1);
    });

    it('creates a user under a specific tenant', async () => {
      prismaMock.tenant.findUnique.mockResolvedValue({ id: 'tenant-uuid-1', name: 'Test Shop', slug: 'testshop' });
      prismaMock.user.findUnique.mockResolvedValue(null); // No collision on email username@testshop.techbill.app
      prismaMock.user.create.mockResolvedValue(mockUser);

      const result = await service.adminCreateUser({
        name: 'New User',
        username: 'newuser',
        password: 'password123',
        role: 'cashier',
        tenantId: 'tenant-uuid-1',
      });

      expect(prismaMock.user.create).toHaveBeenCalled();
      expect(result.name).toBe('Test User'); // returns mocked user
    });

    it('updates user parameters as admin', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.user.update.mockResolvedValue({ ...mockUser, name: 'Updated Name' });

      const result = await service.adminUpdateUser('user-uuid-1', {
        name: 'Updated Name',
        role: 'inventory_manager',
      });

      expect(prismaMock.user.update).toHaveBeenCalled();
      expect(result.name).toBe('Updated Name');
    });
  });
});

