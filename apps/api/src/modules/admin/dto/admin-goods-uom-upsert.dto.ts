import { Type } from "class-transformer";
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from "class-validator";

const goodsUomGroups = ["COUNT", "MASS", "VOLUME", "OTHER"] as const;

export class AdminGoodsUomUpsertDto {
  @IsString()
  @MaxLength(16)
  code!: string;

  @IsString()
  @MaxLength(60)
  label!: string;

  @IsIn(goodsUomGroups)
  groupKey!: (typeof goodsUomGroups)[number];

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  decimals!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
