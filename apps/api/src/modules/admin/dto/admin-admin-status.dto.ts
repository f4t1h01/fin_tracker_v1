import { IsBoolean, IsString, MaxLength, MinLength } from "class-validator";

export class AdminAdminStatusDto {
  @IsBoolean()
  isActive!: boolean;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
