import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class OtpService {
  private readonly ttl: number;
  private readonly length: number;
  private redis: Redis | null = null;
  private memStore = new Map<string, { code: string; expiresAt: number }>();
  private readonly logger = new Logger(OtpService.name);

  constructor(configService: ConfigService) {
    this.ttl = parseInt(configService.get<string>('OTP_TTL_SECONDS', '300'));
    this.length = parseInt(configService.get<string>('OTP_LENGTH', '6'));

    const redisUrl = configService.get<string>('REDIS_URL');
    if (
      redisUrl &&
      !redisUrl.includes('<') &&
      !redisUrl.includes('undefined')
    ) {
      this.redis = new Redis(redisUrl, {
        lazyConnect: true,
        enableOfflineQueue: false,
      });
      this.redis.on('error', (err: Error) => {
        this.logger.warn(
          `Redis unavailable, using in-memory OTP store: ${err.message}`,
        );
        this.redis = null;
      });
    } else {
      this.logger.warn(
        'REDIS_URL not configured — using in-memory OTP store (dev only)',
      );
    }
  }

  async generate(userId: string): Promise<string> {
    const max = Math.pow(10, this.length);
    const code = String(Math.floor(Math.random() * max)).padStart(
      this.length,
      '0',
    );

    if (this.redis) {
      try {
        await this.redis.set(`otp:${userId}`, code, 'EX', this.ttl);
        return code;
      } catch {
        // fall through to memory store
      }
    }

    this.memStore.set(userId, {
      code,
      expiresAt: Date.now() + this.ttl * 1000,
    });
    return code;
  }

  async verify(userId: string, code: string): Promise<boolean> {
    if (this.redis) {
      try {
        const stored = await this.redis.get(`otp:${userId}`);
        if (!stored || stored !== code) return false;
        await this.redis.del(`otp:${userId}`);
        return true;
      } catch {
        // fall through to memory store
      }
    }

    const entry = this.memStore.get(userId);
    if (!entry || entry.expiresAt < Date.now() || entry.code !== code)
      return false;
    this.memStore.delete(userId);
    return true;
  }
}
