import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateIf } from "class-validator";

export class AdminAuthEmailConfigDto {
  @IsBoolean()
  isEnabled!: boolean;

  @ValidateIf((payload: AdminAuthEmailConfigDto) => Boolean(payload.fromEmail?.trim()))
  @IsEmail()
  @MaxLength(200)
  fromEmail!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  fromName?: string;

  @IsString()
  @MaxLength(200)
  smtpHost!: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  smtpPort!: number;

  @IsBoolean()
  smtpSecure!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  smtpUser?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  smtpPassword?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
