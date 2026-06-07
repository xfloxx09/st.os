import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";

export const SESSION_COOKIE = "stalker_session";
const SESSION_DAYS = 30;

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export interface SessionClaims {
  sub: string;
  userId: number;
  telegramId: number;
  username?: string;
  firstName?: string;
}

export async function createSessionToken(claims: SessionClaims): Promise<string> {
  return new SignJWT({
    userId: claims.userId,
    telegramId: claims.telegramId,
    username: claims.username,
    firstName: claims.firstName,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const userId = payload.userId as number | undefined;
    const telegramId = payload.telegramId as number | undefined;
    if (!userId || !telegramId || !payload.sub) return null;

    const db = getDb();
    const session = await db
      .selectFrom("sessions")
      .select(["expires_at"])
      .where("token", "=", token)
      .executeTakeFirst();

    if (!session || session.expires_at < new Date()) return null;

    return {
      sub: payload.sub,
      userId,
      telegramId,
      username: payload.username as string | undefined,
      firstName: payload.firstName as string | undefined,
    };
  } catch {
    return null;
  }
}

export async function getSessionFromCookies(): Promise<SessionClaims | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function sessionExpiryDate(): Date {
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_DAYS);
  return expires;
}
