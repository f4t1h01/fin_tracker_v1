import { IsEmail, MaxLength } from "class-validator";

export class AdminAuthTestEmailDto {
  @IsEmail()
  @MaxLength(200)
  toEmail!: string;
}
