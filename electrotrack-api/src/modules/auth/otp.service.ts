import { randomInt } from 'crypto';
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
        this.logger.warn(`Redis OTP error: ${err.message}`);
      });
    } else {
      this.logger.warn(
        'REDIS_URL not configured — using in-memory OTP store (dev only)',
      );
    }
  }

  async generate(userId: string): Promise<string> {
    const max = Math.pow(10, this.length);
    // crypto.randomInt is CSPRNG-backed — Math.random() is not secure for OTPs
    const code = String(randomInt(0, max)).padStart(this.length, '0');

    if (this.redis) {
      try {
        await this.redis.set(`otp:${userId}`, code, 'EX', this.ttl);
        return code;
      } catch (err) {
        this.logger.warn(
          `Redis OTP write failed, falling back to memory: ${(err as Error).message}`,
        );
      }
    }

    // Memory store fallback (always write so verify() can find it)
    this.memStore.set(userId, {
      code,
      expiresAt: Date.now() + this.ttl * 1000,
    });
    return code;
  }

  async verify(userId: string, code: string): Promise<boolean> {
    // Attempt Redis first — but only if it was also used for generate.
    // We detect this by checking if the key exists in Redis.
    if (this.redis) {
      try {
        const stored = await this.redis.get(`otp:${userId}`);
        if (stored !== null) {
          // Key is in Redis — authoritative source
          if (stored !== code) return false;
          await this.redis.del(`otp:${userId}`);
          // Clean up mem store in case there's a stale entry
          this.memStore.delete(userId);
          return true;
        }
        // Key not in Redis — could be a Redis failure during generate,
        // fall through to mem store
      } catch (err) {
        this.logger.warn(
          `Redis OTP read failed, falling back to memory: ${(err as Error).message}`,
        );
      }
    }

    // Memory store path
    const entry = this.memStore.get(userId);
    if (!entry || entry.expiresAt < Date.now() || entry.code !== code)
      return false;
    this.memStore.delete(userId);
    return true;
  }

  // Used when OTP delivery fails — invalidate so a stale code doesn't linger
  async invalidate(userId: string): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.del(`otp:${userId}`);
      } catch {
        // best-effort
      }
    }
    this.memStore.delete(userId);
  }
}
