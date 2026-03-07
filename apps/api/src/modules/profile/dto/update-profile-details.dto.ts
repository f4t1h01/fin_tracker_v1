import { IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class UpdateProfileDetailsDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  birthday?: string | null;
}
