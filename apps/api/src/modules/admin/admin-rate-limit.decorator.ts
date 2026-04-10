import { SetMetadata } from "@nestjs/common";

export const adminRateLimitMetadataKey = "admin-rate-limit";

export type AdminRateLimitOptions = {
  max: number;
  windowMs: number;
  scope?: string;
};

export const AdminRateLimit = (options: AdminRateLimitOptions) => SetMetadata(adminRateLimitMetadataKey, options);
