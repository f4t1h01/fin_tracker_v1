import { IsBoolean } from "class-validator";

export class UpdateThemePreferenceDto {
  @IsBoolean()
  isDark!: boolean;
}
