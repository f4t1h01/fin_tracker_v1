export const adminSessionCookieName = "cf_admin_session";
// Short-lived on purpose: this session can read the whole database through the
// admin SQL console, so it should not be a week-long credential.
export const adminSessionTtlSeconds = 60 * 60 * 12;
