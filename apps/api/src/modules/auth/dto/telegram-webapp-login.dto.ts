import { IsString, MaxLength } from "class-validator";

export class TelegramWebAppLoginDto {
  @IsString()
  @MaxLength(6000)
  initData!: string;
}
