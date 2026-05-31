import { IsEmail, MaxLength } from "class-validator";

export class EmailCheckDto {
  @IsEmail()
  @MaxLength(200)
  email!: string;
}
