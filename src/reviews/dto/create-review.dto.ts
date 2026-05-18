import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsString, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ minimum: 1, maximum: 5 })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiProperty()
  @IsString()
  text!: string;
}
