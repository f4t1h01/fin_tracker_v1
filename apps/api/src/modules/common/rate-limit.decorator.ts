import { SetMetadata } from "@nestjs/common";

export const rateLimitMetadataKey = "rate-limit-options";

/**
 * Which request facets form the limiter key.
 * - `ip` throttles a single caller.
 * - `user` throttles one authenticated account across addresses.
 * - `email` throttles attacks aimed at one account from many addresses.
 *
 * Every listed facet gets its own independent bucket, so all of them must have
 * budget left for the request to pass.
 */
export type RateLimitKeyFacet = "ip" | "user" | "email";

export type RateLimitOptions = {
  max: number;
  windowMs: number;
  scope: string;
  keys?: RateLimitKeyFacet[];
  message?: string;
};

export const RateLimit = (options: RateLimitOptions) => SetMetadata(rateLimitMetadataKey, options);
