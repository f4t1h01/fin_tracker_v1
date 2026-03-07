import { createHmac, timingSafeEqual } from "node:crypto";

const tokenPrefix = "l";
const expiryLength = 8;
const signatureLength = 22;

function createSignature(userId: string, expiresAt: number, secret: string) {
  return createHmac("sha256", secret).update(`${userId}:${expiresAt}`).digest("base64url").slice(0, signatureLength);
}

export function createTelegramLinkToken(userId: string, secret: string, now = Math.floor(Date.now() / 1000)) {
  if (userId.length > 35) {
    throw new Error("User id is too long to encode");
  }

  const expiresAt = now + 10 * 60;
  const encodedLength = userId.length.toString(36);
  const encodedExpiry = expiresAt.toString(36).padStart(expiryLength, "0");
  const signature = createSignature(userId, expiresAt, secret);

  return `${tokenPrefix}${encodedLength}${userId}${encodedExpiry}${signature}`;
}

export function resolveTelegramLinkToken(token: string, secret: string, now = Math.floor(Date.now() / 1000)) {
  if (!token.startsWith(tokenPrefix) || token.length < 1 + 1 + expiryLength + signatureLength) {
    return null;
  }

  const userIdLength = Number.parseInt(token.slice(1, 2), 36);
  if (!Number.isFinite(userIdLength) || userIdLength < 1) {
    return null;
  }

  const userIdEnd = 2 + userIdLength;
  const expiryEnd = userIdEnd + expiryLength;
  const expectedLength = expiryEnd + signatureLength;

  if (token.length !== expectedLength) {
    return null;
  }

  const userId = token.slice(2, userIdEnd);
  const encodedExpiry = token.slice(userIdEnd, expiryEnd);
  const signature = token.slice(expiryEnd);
  const expiresAt = Number.parseInt(encodedExpiry, 36);

  if (!userId || !Number.isFinite(expiresAt) || expiresAt < now) {
    return null;
  }

  const expectedSignature = createSignature(userId, expiresAt, secret);
  const incoming = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (incoming.length !== expected.length || !timingSafeEqual(incoming, expected)) {
    return null;
  }

  return {
    userId,
    expiresAt
  };
}
