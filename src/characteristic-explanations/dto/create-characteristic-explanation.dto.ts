import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateCharacteristicExplanationDto {
  @ApiProperty()
  @IsString()
  specificationKey!: string;

  @ApiProperty()
  @IsString()
  label!: string;

  @ApiProperty()
  @IsString()
  shortExplanation!: string;

  @ApiProperty()
  @IsString()
  detailedExplanation!: string;

  @ApiProperty()
  @IsString()
  practicalImpact!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  example?: string;
}
