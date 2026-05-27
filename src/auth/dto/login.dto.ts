import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Вкажіть коректний email' })
  email!: string;

  @ApiProperty()
  @IsString({ message: 'Вкажіть пароль' })
  @MinLength(8, { message: 'Пароль має містити щонайменше 8 символів' })
  password!: string;

  @ApiPropertyOptional({
    description: 'Anonymous cart session identifier to merge after login',
  })
  @IsOptional()
  @IsString({ message: 'Некоректний ідентифікатор сесії' })
  sessionId?: string;
}
