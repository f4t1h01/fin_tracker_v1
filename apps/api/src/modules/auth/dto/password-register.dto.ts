import { IsEmail, IsOptional, IsString, Length, MaxLength, MinLength } from "class-validator";

export class PasswordRegisterDto {
  @IsEmail()
  @MaxLength(200)
  email!: string;

  /** One-time code from POST /auth/register/request-code, proving mailbox ownership. */
  @IsString()
  @Length(6, 6)
  code!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  firstName?: string;
}
