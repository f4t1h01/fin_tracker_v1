import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, Matches, Max, Min } from "class-validator";

export const dashboardRangePresets = ["THIS_WEEK", "THIS_MONTH", "SPECIFIC_MONTH", "CUSTOM"] as const;
export const dashboardViewModes = ["COUPLE", "PERSONAL"] as const;
export const dashboardKinds = ["ALL", "EXPENSE", "INCOME"] as const;
export const dashboardActors = ["EVERYONE", "ME", "PARTNER"] as const;

export type DashboardRangePreset = (typeof dashboardRangePresets)[number];
export type DashboardViewMode = (typeof dashboardViewModes)[number];
export type DashboardKind = (typeof dashboardKinds)[number];
export type DashboardActor = (typeof dashboardActors)[number];

export class DashboardQueryDto {
  @IsOptional()
  @IsIn(dashboardRangePresets)
  rangePreset?: DashboardRangePreset;

  @IsOptional()
  @IsIn(dashboardViewModes)
  viewMode?: DashboardViewMode;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/)
  monthKey?: string;

  @IsOptional()
  @IsIn(dashboardKinds)
  kind?: DashboardKind;

  @IsOptional()
  @Matches(/^[A-Za-z0-9_-]{5,}$/)
  categoryId?: string;

  @IsOptional()
  @IsIn(dashboardActors)
  actor?: DashboardActor;

  @IsOptional()
  @Matches(/^[^\s].*$/)
  search?: string;

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  timeFrom?: string;

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  timeTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;
}
