import {
  IsString,
  IsOptional,
  IsUrl,
  IsNumber,
  Min,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @MaxLength(200)
  restaurantName: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  restaurantUrl?: string;

  @IsString()
  @MaxLength(500)
  deliveryAddress: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  deliveryCost: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  freeDeliveryThreshold?: number;

  @IsDateString()
  deadlineAt: string;
}