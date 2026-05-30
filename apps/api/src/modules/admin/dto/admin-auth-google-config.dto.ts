import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class AdminAuthGoogleConfigDto {
  @IsBoolean()
  isEnabled!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  clientId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  hostedDomain?: string;

  @IsBoolean()
  autoCreateUsers!: boolean;

  @IsBoolean()
  linkByVerifiedEmail!: boolean;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
