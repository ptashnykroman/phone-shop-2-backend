import { PartialType } from '@nestjs/swagger';
import { CreateProductSpecificationDto } from '../../products/dto/create-product-specification.dto';

export class CreateCharacteristicDto extends CreateProductSpecificationDto {}

export class UpdateCharacteristicDto extends PartialType(CreateCharacteristicDto) {}
