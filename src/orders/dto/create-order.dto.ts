import { ApiProperty } from '@nestjs/swagger';
import { DeliveryType, PaymentMethod } from '@prisma/client';
import { IsEnum, IsString } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({ enum: DeliveryType })
  @IsEnum(DeliveryType)
  deliveryType!: DeliveryType;

  @ApiProperty()
  @IsString()
  deliveryAddress!: string;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;
}
