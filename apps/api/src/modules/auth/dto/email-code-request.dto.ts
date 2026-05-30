import { IsEmail, MaxLength } from "class-validator";

export class EmailCodeRequestDto {
  @IsEmail()
  @MaxLength(200)
  email!: string;
}
