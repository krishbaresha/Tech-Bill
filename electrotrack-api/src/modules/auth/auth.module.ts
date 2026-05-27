import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from '../../common/guards/roles.guard';
import { OtpGuard } from '../../common/guards/otp.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_ACCESS_EXPIRES_IN', '15m') as any,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    OtpService,
    JwtStrategy,
    RolesGuard,
    OtpGuard,
    JwtAuthGuard,
    TenantGuard,
    PermissionsGuard,
  ],
  exports: [
    JwtModule,
    PassportModule,
    RolesGuard,
    OtpGuard,
    JwtAuthGuard,
    TenantGuard,
    PermissionsGuard,
    AuthService,
  ],
})
export class AuthModule {}
