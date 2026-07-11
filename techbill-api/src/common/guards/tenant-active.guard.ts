import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantActiveGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Only block mutating requests (POST, PUT, PATCH, DELETE)
    const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (!mutatingMethods.includes(request.method)) {
      return true; // Allow GET requests
    }

    const tenantId = request.headers['x-tenant-id'];
    if (!tenantId) {
      return true; // Pass through if no tenant ID is present (might be system/admin route)
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId as string },
      select: { status: true, subscriptionExpiresAt: true, currentPeriodEnd: true }
    });

    if (!tenant) {
      return true;
    }

    if (tenant.status !== 'active') {
      throw new ForbiddenException(`Subscription inactive. Current status: ${tenant.status}`);
    }

    const now = new Date();
    if (tenant.subscriptionExpiresAt && tenant.subscriptionExpiresAt < now) {
      throw new ForbiddenException('Subscription has expired.');
    }

    if (!tenant.currentPeriodEnd || tenant.currentPeriodEnd < now) {
      throw new ForbiddenException('Current billing period has ended or not activated. Please renew subscription.');
    }

    return true;
  }
}
