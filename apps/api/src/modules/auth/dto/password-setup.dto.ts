import { IsEmail, IsString, Length, MaxLength, MinLength } from "class-validator";

export class PasswordSetupDto {
  @IsEmail()
  @MaxLength(200)
  email!: string;

  /** One-time code from POST /auth/email/claim/request, proving mailbox ownership. */
  @IsString()
  @Length(6, 6)
  code!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
