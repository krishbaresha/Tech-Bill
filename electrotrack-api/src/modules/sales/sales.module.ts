import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SalesController } from './sales.controller';
import { PublicSalesController } from './public-sales.controller';
import { SalesService } from './sales.service';
import { OtpGuard } from '../../common/guards/otp.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [SalesController, PublicSalesController],
  providers: [SalesService, OtpGuard],
  exports: [SalesService],
})
export class SalesModule {}

