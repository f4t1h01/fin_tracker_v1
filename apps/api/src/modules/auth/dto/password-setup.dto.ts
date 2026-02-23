import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

export class PasswordSetupDto {
  @IsEmail()
  @MaxLength(200)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
