import { IsString, MaxLength, MinLength } from "class-validator";

export class AdminSqlExecuteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  statement!: string;
}
