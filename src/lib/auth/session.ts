import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import {
  GUEST_SEARCH_LIMIT,
  getGuestSession,
  guestSearchesRemaining,
} from "@/lib/auth/guest";

export const SESSION_COOKIE = "ca_session";
export const LEGACY_SESSION_COOKIE = "stalker_session";
const SESSION_DAYS = 30;

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export interface UserSession {
  type: "user";
  sub: string;
  userId: number;
  telegramId: number;
  username?: string;
  firstName?: string;
}

export interface GuestSession {
  type: "guest";
  sub: string;
  guestId: string;
  searchesUsed: number;
  searchesRemaining: number;
  searchesLimit: number;
}

export type AuthSession = UserSession | GuestSession;

export async function createUserSessionToken(
  claims: Omit<UserSession, "type">
): Promise<string> {
  return new SignJWT({
    type: "user",
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

export async function createGuestSessionToken(
  guestId: string
): Promise<string> {
  return new SignJWT({
    type: "guest",
    guestId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(`guest:${guestId}`)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifyAuthToken(token: string): Promise<AuthSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const type = payload.type as string | undefined;

    if (type === "guest") {
      const guestId = payload.guestId as string | undefined;
      if (!guestId) return null;

      const guest = await getGuestSession(guestId);
      if (!guest || guest.expires_at < new Date()) return null;

      return {
        type: "guest",
        sub: `guest:${guestId}`,
        guestId,
        searchesUsed: guest.search_count,
        searchesRemaining: guestSearchesRemaining(guest.search_count),
        searchesLimit: GUEST_SEARCH_LIMIT,
      };
    }

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
      type: "user",
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

export async function getAuthSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const token =
    cookieStore.get(SESSION_COOKIE)?.value ??
    cookieStore.get(LEGACY_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyAuthToken(token);
}

export function userSessionExpiryDate(): Date {
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_DAYS);
  return expires;
}
