import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const BCRYPT_ROUNDS = 12;

const ALL_PERMISSIONS = [
  'pos.read', 'pos.sell', 'pos.discount', 'pos.void',
  'inventory.read', 'inventory.write', 'inventory.delete',
  'suppliers.read', 'suppliers.write',
  'customers.read', 'customers.write',
  'returns.read', 'returns.create', 'returns.review',
  'reports.read', 'reports.cash_reconciliation',
  'users.read', 'users.manage', 'users.permissions',
  'settings.read', 'settings.manage',
  'audit.read', 'notifications.read', 'notifications.manage',
  'warranty.read', 'loyalty.read', 'loyalty.manage'
];

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async listTenants() {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { users: true }
        }
      }
    });
  }

  async createTenant(dto: {
    name: string;
    slug: string;
    plan?: string;
    maxUsers?: number;
    ownerName: string;
    ownerEmail: string;
    ownerPasswordHashOrText: string;
  }) {
    // 1. Check if tenant slug or owner email already exists
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug }
    });
    if (existingTenant) {
      throw new ConflictException(`Tenant slug "${dto.slug}" is already in use`);
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.ownerEmail }
    });
    if (existingUser) {
      throw new ConflictException(`Email "${dto.ownerEmail}" is already in use`);
    }

    const passwordHash = await bcrypt.hash(dto.ownerPasswordHashOrText, BCRYPT_ROUNDS);

    // Create tenant, initial owner user, and default shop settings inside a transaction
    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          plan: dto.plan || 'trial',
          maxUsers: dto.maxUsers || 5,
        }
      });

      const owner = await tx.user.create({
        data: {
          name: dto.ownerName,
          email: dto.ownerEmail,
          passwordHash,
          role: Role.owner,
          tenantId: tenant.id,
          permissions: ALL_PERMISSIONS,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true
        }
      });

      // Seed default shop settings for the new tenant
      await tx.shopSettings.create({
        data: {
          tenantId: tenant.id,
          shopName: dto.name,
          maxDiscountWithoutOtp: 500,
        }
      });

      return { tenant, owner };
    });
  }

  async updateTenant(
    id: string,
    dto: {
      status?: string;
      plan?: string;
      maxUsers?: number;
    }
  ) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID "${id}" not found`);
    }

    return this.prisma.tenant.update({
      where: { id },
      data: dto
    });
  }

  async getTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true
          }
        }
      }
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID "${id}" not found`);
    }
    return tenant;
  }
}
