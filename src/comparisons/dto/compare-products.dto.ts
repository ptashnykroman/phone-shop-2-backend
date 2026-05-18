import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class CompareProductsDto {
  @ApiProperty({ type: [String], minItems: 2, maxItems: 4 })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(4)
  @IsUUID('4', { each: true })
  productIds!: string[];
}
