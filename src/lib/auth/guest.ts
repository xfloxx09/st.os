import { randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";

export const GUEST_SEARCH_LIMIT = 5;
const GUEST_SESSION_DAYS = 7;

export function guestExpiryDate(): Date {
  const expires = new Date();
  expires.setDate(expires.getDate() + GUEST_SESSION_DAYS);
  return expires;
}

export async function createGuestSession(): Promise<{
  guestId: string;
  expiresAt: Date;
}> {
  const db = getDb();
  const guestId = randomBytes(24).toString("hex");
  const expiresAt = guestExpiryDate();

  await db
    .insertInto("guest_sessions")
    .values({
      id: guestId,
      search_count: 0,
      expires_at: expiresAt,
    })
    .execute();

  return { guestId, expiresAt };
}

export async function getGuestSession(guestId: string) {
  const db = getDb();
  return db
    .selectFrom("guest_sessions")
    .selectAll()
    .where("id", "=", guestId)
    .executeTakeFirst();
}

export async function incrementGuestSearches(guestId: string): Promise<number> {
  const db = getDb();
  const row = await getGuestSession(guestId);
  if (!row) throw new Error("Guest session not found");

  const next = row.search_count + 1;
  await db
    .updateTable("guest_sessions")
    .set({ search_count: next })
    .where("id", "=", guestId)
    .execute();

  return next;
}

export async function deleteGuestSession(guestId: string): Promise<void> {
  const db = getDb();
  await db.deleteFrom("guest_sessions").where("id", "=", guestId).execute();
}

export function guestSearchesRemaining(searchCount: number): number {
  return Math.max(0, GUEST_SEARCH_LIMIT - searchCount);
}
