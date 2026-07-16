import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { SalesModule } from './modules/sales/sales.module';
import { ReturnsModule } from './modules/returns/returns.module';
import { AuditModule } from './modules/audit/audit.module';
import { EventsModule } from './modules/events/events.module';
import { ReportsModule } from './modules/reports/reports.module';
import { UsersModule } from './modules/users/users.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { SettingsModule } from './modules/settings/settings.module';
import { AiModule } from './modules/ai/ai.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { CreditModule } from './modules/credit/credit.module';
import { IntegrityModule } from './modules/integrity/integrity.module';
import { FeaturesModule } from './modules/features/features.module';
import { LicenseModule } from './modules/license/license.module';
import { DevicesModule } from './modules/devices/devices.module';
import { SyncModule } from './modules/sync/sync.module';

import { TenantActiveGuard } from './common/guards/tenant-active.guard';
import { FeatureGuard } from './common/guards/feature.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    InventoryModule,
    SalesModule,
    ReturnsModule,
    AuditModule,
    EventsModule,
    ReportsModule,
    UsersModule,
    NotificationsModule,
    SuppliersModule,
    TenantsModule,
    SettingsModule,
    AiModule,
    ExpensesModule,
    PaymentsModule,
    CreditModule,
    IntegrityModule,
    FeaturesModule,
    LicenseModule,
    DevicesModule,
    SyncModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: TenantActiveGuard },
    { provide: APP_GUARD, useClass: FeatureGuard },
  ],
})
export class AppModule {}
