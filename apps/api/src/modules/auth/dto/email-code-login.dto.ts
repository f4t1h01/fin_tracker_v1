import { IsEmail, IsString, Length, MaxLength } from "class-validator";

export class EmailCodeLoginDto {
  @IsEmail()
  @MaxLength(200)
  email!: string;

  @IsString()
  @Length(6, 6)
  code!: string;
}
