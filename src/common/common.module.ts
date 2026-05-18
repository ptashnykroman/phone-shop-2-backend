import { Global, Module } from '@nestjs/common';
import { RedisCacheService } from './utils/redis-cache.service';

@Global()
@Module({
  providers: [RedisCacheService],
  exports: [RedisCacheService],
})
export class CommonModule {}
