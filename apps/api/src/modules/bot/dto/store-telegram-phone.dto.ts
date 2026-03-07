import { Type } from "class-transformer";
import { IsNumberString, IsString, Matches, MaxLength } from "class-validator";

export class StoreTelegramPhoneDto {
  @Type(() => String)
  @IsNumberString()
  telegramId!: string;

  @IsString()
  @MaxLength(32)
  @Matches(/^\+?[0-9]{5,20}$/)
  phoneNumber!: string;
}
