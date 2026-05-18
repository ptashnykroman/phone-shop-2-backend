import { Injectable } from '@nestjs/common';
import { RedisCacheService } from '../common/utils/redis-cache.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: RedisCacheService,
  ) {}

  async check() {
    await this.prisma.$queryRaw`SELECT 1`;
    const cache = await this.cacheService.ping();

    return {
      status: 'ok',
      database: 'up',
      cache,
      timestamp: new Date().toISOString(),
    };
  }
}
