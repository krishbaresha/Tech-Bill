import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DeviceStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DevicesService {
  constructor(private prisma: PrismaService) {}

  async listDevices(licenseId?: string) {
    return this.prisma.device.findMany({
      where: licenseId ? { licenseId } : undefined,
      select: {
        id: true,
        deviceName: true,
        deviceType: true,
        os: true,
        machineHash: true,
        appVersion: true,
        lastLoginAt: true,
        lastCheckinAt: true,
        status: true,
        createdAt: true,
        license: {
          select: {
            id: true,
            licenseKey: true,
            plan: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async removeDevice(id: string) {
    const device = await this.prisma.device.findUnique({ where: { id } });
    if (!device) throw new NotFoundException(`Device ${id} not found`);

    if (device.status === DeviceStatus.REMOVED) {
      throw new ForbiddenException('Device is already removed');
    }

    return this.prisma.device.update({
      where: { id },
      data: { status: DeviceStatus.REMOVED },
      select: { id: true, deviceName: true, status: true },
    });
  }

  async resetActivations(licenseId: string) {
    const license = await this.prisma.license.findUnique({
      where: { id: licenseId },
    });
    if (!license) throw new NotFoundException(`License ${licenseId} not found`);

    const { count } = await this.prisma.device.updateMany({
      where: { licenseId, status: DeviceStatus.ACTIVE },
      data: { status: DeviceStatus.REMOVED },
    });

    return {
      message: `Reset ${count} active device(s) for license ${licenseId}`,
      devicesRemoved: count,
    };
  }
}
