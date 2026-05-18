import { Module } from '@nestjs/common';
import { PerformanceScoresModule } from '../performance-scores/performance-scores.module';
import { AlternativesService } from './alternatives.service';

@Module({
  imports: [PerformanceScoresModule],
  providers: [AlternativesService],
  exports: [AlternativesService],
})
export class AlternativesModule {}
