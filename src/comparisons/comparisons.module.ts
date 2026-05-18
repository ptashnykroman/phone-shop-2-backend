import { Module } from '@nestjs/common';
import { PerformanceScoresModule } from '../performance-scores/performance-scores.module';
import { ComparisonsController } from './comparisons.controller';
import { ComparisonsService } from './comparisons.service';

@Module({
  imports: [PerformanceScoresModule],
  controllers: [ComparisonsController],
  providers: [ComparisonsService],
  exports: [ComparisonsService],
})
export class ComparisonsModule {}
