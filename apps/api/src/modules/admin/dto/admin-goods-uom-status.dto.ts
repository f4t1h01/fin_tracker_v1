import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class AdminGoodsUomStatusDto {
  @IsBoolean()
  isActive!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
