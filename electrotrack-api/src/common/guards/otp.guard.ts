import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class OtpGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.headers['x-otp-token'] as string;

    if (!token) {
      throw new UnauthorizedException('OTP token required');
    }

    try {
      this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired OTP token');
    }
  }
}
