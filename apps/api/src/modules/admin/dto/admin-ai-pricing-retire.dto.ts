import { IsOptional, IsString, MaxLength } from "class-validator";

export class AdminAiPricingRetireDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
