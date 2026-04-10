import { IsOptional, IsString } from "class-validator";

import { AdminListQueryDto } from "./admin-list-query.dto";

export class AdminAuditQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  actionType?: string;

  @IsOptional()
  @IsString()
  adminEmail?: string;

  @IsOptional()
  @IsString()
  targetType?: string;

  @IsOptional()
  @IsString()
  outcome?: string;
}
