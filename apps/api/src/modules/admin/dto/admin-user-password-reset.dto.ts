import { IsString, MaxLength, MinLength } from "class-validator";

export class AdminUserPasswordResetDto {
  @IsString()
  @MinLength(8)
  @MaxLength(200)
  newPassword!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
