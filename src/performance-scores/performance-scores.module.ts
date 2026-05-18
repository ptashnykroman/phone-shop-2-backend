import { Module } from '@nestjs/common';
import { PerformanceScoresService } from './performance-scores.service';

@Module({
  providers: [PerformanceScoresService],
  exports: [PerformanceScoresService],
})
export class PerformanceScoresModule {}
