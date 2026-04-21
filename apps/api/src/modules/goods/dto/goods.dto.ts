import { Transform, Type } from "class-transformer";
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from "class-validator";

import { IsGoodsUomId, IsPrismaEntityId } from "../../common/prisma-id.validator";

const goodsScopes = ["PERSONAL", "SHARED"] as const;
const consumptionUnits = ["HOUR", "DAY", "WEEK", "PERMANENT"] as const;
const stockStatuses = ["FULL", "ENOUGH", "LOW", "OUT_OF_STOCK"] as const;
const expirationStatuses = ["FRESH", "EXPIRING_SOON", "EXPIRED", "NO_EXPIRATION"] as const;
const goodsSortOptions = ["RECENTLY_UPDATED", "EXPIRATION_ASC", "RUN_OUT_ASC", "LOW_QUANTITY", "NAME", "PLACE", "CATEGORY"] as const;

function parseBoolean(value: unknown) {
  if (value === true || value === "true") {
    return true;
  }

  if (value === false || value === "false") {
    return false;
  }

  return value;
}

export class GoodsListQueryDto {
  @IsOptional()
  @IsPrismaEntityId()
  placeId?: string;

  @IsOptional()
  @IsPrismaEntityId()
  categoryId?: string;

  @IsOptional()
  @IsIn(goodsScopes)
  scope?: (typeof goodsScopes)[number];

  @IsOptional()
  @IsIn(stockStatuses)
  stockStatus?: (typeof stockStatuses)[number];

  @IsOptional()
  @IsIn(expirationStatuses)
  expirationStatus?: (typeof expirationStatuses)[number];

  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  @IsBoolean()
  lowOnly?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  @IsBoolean()
  recentlyUpdatedOnly?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  @IsBoolean()
  autoConsumptionOnly?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsIn(goodsSortOptions)
  sort?: (typeof goodsSortOptions)[number];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pageSize?: number;
}

export class CreateGoodsPlaceDto {
  @IsIn(goodsScopes)
  scope!: (typeof goodsScopes)[number];

  @IsString()
  @MaxLength(80)
  name!: string;
}

export class UpdateGoodsPlaceDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;
}

export class CreateGoodsCategoryDto {
  @IsIn(goodsScopes)
  scope!: (typeof goodsScopes)[number];

  @IsString()
  @MaxLength(80)
  name!: string;
}

export class UpdateGoodsCategoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;
}

export class UpdateGoodsVisibilityDto {
  @Transform(({ value }) => parseBoolean(value))
  @IsBoolean()
  isVisible!: boolean;
}

export class CreateGoodsItemDto {
  @IsIn(goodsScopes)
  scope!: (typeof goodsScopes)[number];

  @IsPrismaEntityId()
  placeId!: string;

  @IsPrismaEntityId()
  categoryId!: string;

  @IsGoodsUomId({ message: "Choose a valid unit of measure." })
  uomId!: string;

  @IsString()
  @MaxLength(120)
  name!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  lowStockThreshold?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  targetQuantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsString()
  expirationDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  consumptionRateValue?: number;

  @IsOptional()
  @IsIn(consumptionUnits)
  consumptionRateUnit?: (typeof consumptionUnits)[number];
}

export class UpdateGoodsItemDto {
  @IsOptional()
  @IsPrismaEntityId()
  placeId?: string;

  @IsOptional()
  @IsPrismaEntityId()
  categoryId?: string;

  @IsOptional()
  @IsGoodsUomId({ message: "Choose a valid unit of measure." })
  uomId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  lowStockThreshold?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  targetQuantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsString()
  expirationDate?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  consumptionRateValue?: number | null;

  @IsOptional()
  @IsIn(consumptionUnits)
  consumptionRateUnit?: (typeof consumptionUnits)[number];
}

export class GoodsQuantityMutationDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

export class GoodsReconcileDto extends GoodsQuantityMutationDto {}

export class GoodsMoveDto {
  @IsPrismaEntityId()
  placeId!: string;

  @IsPrismaEntityId()
  categoryId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

export class GoodsArchiveDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
