import { Type } from "class-transformer";
import { IsNumberString, IsOptional, IsString } from "class-validator";

export class TelegramLoginDto {
  @Type(() => String)
  @IsNumberString()
  id!: string;

  @IsString()
  first_name!: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  photo_url?: string;

  @Type(() => String)
  @IsNumberString()
  auth_date!: string;

  @IsString()
  hash!: string;
}
