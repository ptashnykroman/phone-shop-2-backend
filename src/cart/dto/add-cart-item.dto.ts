import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsUUID, Max, Min } from 'class-validator';

export class AddCartItemDto {
  @ApiProperty()
  @IsUUID('4')
  productId!: string;

  @ApiProperty({ minimum: 1, maximum: 20 })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(20)
  quantity!: number;
}
