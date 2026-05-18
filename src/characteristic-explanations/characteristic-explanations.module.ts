import { Module } from '@nestjs/common';
import { CharacteristicExplanationsController } from './characteristic-explanations.controller';
import { CharacteristicExplanationsService } from './characteristic-explanations.service';

@Module({
  controllers: [CharacteristicExplanationsController],
  providers: [CharacteristicExplanationsService],
  exports: [CharacteristicExplanationsService],
})
export class CharacteristicExplanationsModule {}
