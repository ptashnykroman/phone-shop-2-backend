import { PartialType } from '@nestjs/swagger';
import { CreateProductSpecificationDto } from './create-product-specification.dto';

export class UpdateProductSpecificationDto extends PartialType(
  CreateProductSpecificationDto,
) {}
