import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateSavedRestaurantDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  url?: string;
}

export class UpdateSavedRestaurantDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  url?: string;
}