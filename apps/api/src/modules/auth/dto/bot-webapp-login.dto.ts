import { Type } from "class-transformer";
import { IsInt, IsNumberString, IsOptional, IsString, Length, MaxLength, Min } from "class-validator";

export class BotWebAppLoginDto {
  @Type(() => String)
  @IsNumberString()
  telegramId!: string;

  @IsOptional()
  @Type(() => String)
  @IsNumberString()
  chatId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  timestamp!: number;

  @IsString()
  @Length(64, 64)
  signature!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  linkToken?: string;
}
