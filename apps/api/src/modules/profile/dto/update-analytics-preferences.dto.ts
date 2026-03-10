import { IsIn } from "class-validator";

export const weekStartDays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const;

export type WeekStartDay = (typeof weekStartDays)[number];

export class UpdateAnalyticsPreferencesDto {
  @IsIn(weekStartDays)
  weekStartsOn!: WeekStartDay;
}
