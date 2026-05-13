import { IsString, IsNumber, Min, MaxLength, IsInt } from 'class-validator';

export class CreateOrderItemDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  pricePerUnit: number;

  @IsInt()
  @Min(1)
  quantity: number;
}