import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ToggleFavoriteDto {
  @ApiProperty()
  @IsUUID('4')
  productId!: string;
}
