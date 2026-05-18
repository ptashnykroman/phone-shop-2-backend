import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean } from 'class-validator';

export class ModerateReviewDto {
  @ApiProperty()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isApproved!: boolean;
}
