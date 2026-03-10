import { IsIn, IsOptional, Matches } from "class-validator";

export const dashboardRangePresets = ["THIS_WEEK", "THIS_MONTH", "CUSTOM"] as const;

export type DashboardRangePreset = (typeof dashboardRangePresets)[number];

export class DashboardQueryDto {
  @IsOptional()
  @IsIn(dashboardRangePresets)
  rangePreset?: DashboardRangePreset;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;
}
