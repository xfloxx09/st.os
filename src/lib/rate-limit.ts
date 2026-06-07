import { getDb } from "@/lib/db";

export type RateLimitAction = "analyze_ca" | "stalk_wallet" | "cross_analyze";

const LIMITS: Record<RateLimitAction, { max: number; windowMs: number }> = {
  analyze_ca: { max: 20, windowMs: 60 * 60 * 1000 },
  stalk_wallet: { max: 50, windowMs: 60 * 60 * 1000 },
  cross_analyze: { max: 10, windowMs: 60 * 60 * 1000 },
};

export async function checkRateLimit(
  userId: number,
  action: RateLimitAction
): Promise<{ allowed: boolean; remaining: number }> {
  const db = getDb();
  const { max, windowMs } = LIMITS[action];
  const windowStart = new Date(Date.now() - windowMs);

  const existing = await db
    .selectFrom("rate_limits")
    .selectAll()
    .where("user_id", "=", userId)
    .where("action", "=", action)
    .where("window_start", ">=", windowStart)
    .orderBy("window_start", "desc")
    .executeTakeFirst();

  if (!existing) {
    await db
      .insertInto("rate_limits")
      .values({ user_id: userId, action, count: 1 })
      .execute();
    return { allowed: true, remaining: max - 1 };
  }

  if (existing.count >= max) {
    return { allowed: false, remaining: 0 };
  }

  await db
    .updateTable("rate_limits")
    .set({ count: existing.count + 1 })
    .where("id", "=", existing.id)
    .execute();

  return { allowed: true, remaining: max - existing.count - 1 };
}
