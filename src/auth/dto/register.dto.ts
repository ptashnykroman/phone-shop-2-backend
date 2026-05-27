import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Вкажіть коректний email' })
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString({ message: 'Вкажіть пароль' })
  @MinLength(8, { message: 'Пароль має містити щонайменше 8 символів' })
  password!: string;

  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: "Вкажіть ім'я" })
  firstName!: string;

  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Вкажіть прізвище' })
  lastName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    const digits = trimmed.replace(/\D/g, '');
    if (!digits) {
      return undefined;
    }

    return trimmed.startsWith('+') ? `+${digits}` : digits;
  })
  @Matches(/^\+?\d{10,15}$/, { message: 'Вкажіть коректний номер телефону' })
  phone?: string;
}
