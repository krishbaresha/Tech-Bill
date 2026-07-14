import { Module } from '@nestjs/common';
import { FeaturesService } from './features.service';
import { FeaturesController } from './features.controller';
import { LicenseResolverService } from './license-resolver.service';

@Module({
  controllers: [FeaturesController],
  providers: [FeaturesService, LicenseResolverService],
  exports: [FeaturesService, LicenseResolverService],
})
export class FeaturesModule {}
