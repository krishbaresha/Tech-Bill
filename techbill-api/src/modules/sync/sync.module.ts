import { Module } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { SYNC_REPOSITORY } from './sync.types';
import { PrismaSyncRepository } from './prisma-sync.repository';

import { PrismaModule } from '../../prisma/prisma.module';

/**
 * Sync module (ARCHITECTURE.md §5-6).
 */
@Module({
  imports: [PrismaModule],
  controllers: [SyncController],
  providers: [
    SyncService,
    {
      provide: SYNC_REPOSITORY,
      useClass: PrismaSyncRepository,
    },
  ],
  exports: [SyncService],
})
export class SyncModule {}

export { PrismaSyncRepository };
