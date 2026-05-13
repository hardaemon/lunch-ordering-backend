import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSavedAddressDto {
  @IsString()
  @MaxLength(100)
  label: string;

  @IsString()
  @MaxLength(500)
  address: string;
}

export class UpdateSavedAddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;
}