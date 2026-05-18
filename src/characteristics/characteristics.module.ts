import { Module } from '@nestjs/common';
import { PerformanceScoresModule } from '../performance-scores/performance-scores.module';
import { CharacteristicsController } from './characteristics.controller';
import { CharacteristicsService } from './characteristics.service';

@Module({
  imports: [PerformanceScoresModule],
  controllers: [CharacteristicsController],
  providers: [CharacteristicsService],
  exports: [CharacteristicsService],
})
export class CharacteristicsModule {}
