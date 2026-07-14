import { Module } from '@nestjs/common';
import { IntegrityController } from './integrity.controller.js';
import { IntegrityService } from './integrity.service.js';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [IntegrityController],
  providers: [IntegrityService],
  exports: [IntegrityService],
})
export class IntegrityModule {}
