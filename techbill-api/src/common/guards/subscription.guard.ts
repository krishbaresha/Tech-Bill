import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Guard that blocks write operations (e.g. creating sales) when the
 * tenant's subscription has expired (currentPeriodEnd is in the past).
 * Read-only operations remain unaffected.
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Platform admins and users without a tenant are not subject to subscription checks
    if (!user?.tenantId) return true;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { currentPeriodEnd: true },
    });

    // If no subscription period is set, allow (not yet activated = no restriction)
    if (!tenant?.currentPeriodEnd) return true;

    const now = new Date();
    if (tenant.currentPeriodEnd < now) {
      throw new ForbiddenException(
        'Your subscription has expired. Please contact the platform admin to renew your plan before creating new sales.',
      );
    }

    return true;
  }
}
