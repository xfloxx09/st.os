import { createHash, createHmac } from "node:crypto";

export interface TelegramAuthPayload {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

const AUTH_MAX_AGE_SECONDS = 86_400;

export function verifyTelegramAuth(
  payload: TelegramAuthPayload,
  botToken: string
): boolean {
  const { hash, ...rest } = payload;
  if (!hash || !rest.id || !rest.auth_date) return false;

  const now = Math.floor(Date.now() / 1000);
  if (now - rest.auth_date > AUTH_MAX_AGE_SECONDS) return false;

  const dataCheckString = Object.entries(rest)
    .filter(([, value]) => value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = createHash("sha256").update(botToken).digest();
  const computedHash = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  return computedHash === hash;
}
