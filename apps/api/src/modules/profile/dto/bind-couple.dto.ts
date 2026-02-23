import { IsString, Length } from "class-validator";

export class BindCoupleDto {
  @IsString()
  @Length(4, 16)
  code!: string;
}
