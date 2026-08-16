import { Module } from '@nestjs/common';
import { RestorePointService } from './restore-point.service';
import { RestorePointController } from './restore-point.controller';
import { PublicRestorePointController } from './public-restore-point.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RestorePointController, PublicRestorePointController],
  providers: [RestorePointService],
  exports: [RestorePointService],
})
export class RestorePointModule {}
