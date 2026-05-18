import { Module } from '@nestjs/common';
import { AlternativesModule } from '../alternatives/alternatives.module';
import { CharacteristicExplanationsModule } from '../characteristic-explanations/characteristic-explanations.module';
import { ImagesModule } from '../images/images.module';
import { PerformanceScoresModule } from '../performance-scores/performance-scores.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [
    ImagesModule,
    PerformanceScoresModule,
    AlternativesModule,
    CharacteristicExplanationsModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
