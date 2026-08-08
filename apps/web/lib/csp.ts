/**
 * Header used to pass the per-request CSP nonce from middleware.ts to the root
 * layout. Kept in its own module so the layout does not import the middleware
 * entrypoint (which runs in the edge runtime).
 */
export const nonceHeaderName = "x-duet-csp-nonce";
