import { IsBooleanString, IsIn, IsOptional, IsString } from "class-validator";

import { AdminListQueryDto } from "./admin-list-query.dto";

export class AdminCategoriesQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsIn(["EXPENSE", "INCOME"])
  kind?: "EXPENSE" | "INCOME";

  @IsOptional()
  @IsIn(["PERSONAL", "SHARED"])
  scope?: "PERSONAL" | "SHARED";

  @IsOptional()
  @IsString()
  coupleId?: string;

  @IsOptional()
  @IsString()
  ownerUserId?: string;

  @IsOptional()
  @IsBooleanString()
  isVisible?: string;
}
