import { PartialType } from '@nestjs/swagger';
import { CreateCharacteristicExplanationDto } from './create-characteristic-explanation.dto';

export class UpdateCharacteristicExplanationDto extends PartialType(
  CreateCharacteristicExplanationDto,
) {}
