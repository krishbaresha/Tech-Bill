import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ReturnsController } from './returns.controller';
import { ReturnsService } from './returns.service';
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
  controllers: [ReturnsController],
  providers: [ReturnsService, OtpGuard],
  exports: [ReturnsService],
})
export class ReturnsModule {}
