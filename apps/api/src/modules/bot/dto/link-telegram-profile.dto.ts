import { Type } from "class-transformer";
import { IsNumberString, IsOptional, IsString, MaxLength } from "class-validator";

export class LinkTelegramProfileDto {
  @IsString()
  @MaxLength(80)
  linkToken!: string;

  @Type(() => String)
  @IsNumberString()
  telegramId!: string;

  @IsOptional()
  @Type(() => String)
  @IsNumberString()
  chatId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string;
}
