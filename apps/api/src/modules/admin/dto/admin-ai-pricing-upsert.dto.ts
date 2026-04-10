import { Type } from "class-transformer";
import { IsDateString, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from "class-validator";

export class AdminAiPricingUpsertDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  model!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  textInputMicrosPer1m?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  audioInputMicrosPer1m?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  textOutputMicrosPer1m?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  audioOutputMicrosPer1m?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;
}
