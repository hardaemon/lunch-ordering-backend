import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DevicePlatform } from '../entities/device-token.entity';

export class RegisterTokenDto {
  @IsString()
  token: string;

  @IsOptional()
  @IsEnum(DevicePlatform)
  platform?: DevicePlatform;
}