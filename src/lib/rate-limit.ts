import { getDb } from "@/lib/db";
import { hasActiveSubscription, isAdmin } from "@/lib/billing/subscription";

export type RateLimitAction =
  | "analyze_ca"
  | "stalk_wallet"
  | "cross_analyze"
  | "expose_scan";

const LIMITS: Record<RateLimitAction, { max: number; windowMs: number }> = {
  analyze_ca: { max: 30, windowMs: 60 * 60 * 1000 },
  stalk_wallet: { max: 80, windowMs: 60 * 60 * 1000 },
  cross_analyze: { max: 25, windowMs: 60 * 60 * 1000 },
  expose_scan: { max: 40, windowMs: 60 * 60 * 1000 },
};

const PRO_MULTIPLIER = 3;

const ACTION_LABELS: Record<RateLimitAction, string> = {
  analyze_ca: "contract scans",
  stalk_wallet: "wallet analyses",
  cross_analyze: "deep scans (network, fund trace, expose)",
  expose_scan: "exposed wallet scans",
};

export function rateLimitErrorMessage(action: RateLimitAction): string {
  const { max, windowMs } = LIMITS[action];
  const hours = Math.round(windowMs / (60 * 60 * 1000));
  return (
    `App rate limit reached (${max} ${ACTION_LABELS[action]} per ${hours}h). ` +
    "This is not your Alchemy/Etherscan quota — it resets automatically. " +
    "Cached results do not count."
  );
}

async function effectiveMax(
  userId: number,
  action: RateLimitAction
): Promise<number> {
  if (await isAdmin(userId)) return Number.MAX_SAFE_INTEGER;
  const base = LIMITS[action].max;
  if (await hasActiveSubscription(userId)) return base * PRO_MULTIPLIER;
  return base;
}

export async function checkRateLimit(
  userId: number,
  action: RateLimitAction
): Promise<{ allowed: boolean; remaining: number; bypassed: boolean }> {
  if (await isAdmin(userId)) {
    return { allowed: true, remaining: 9999, bypassed: true };
  }

  const db = getDb();
  const { windowMs } = LIMITS[action];
  const max = await effectiveMax(userId, action);
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
    return { allowed: true, remaining: max - 1, bypassed: false };
  }

  if (existing.count >= max) {
    return { allowed: false, remaining: 0, bypassed: false };
  }

  await db
    .updateTable("rate_limits")
    .set({ count: existing.count + 1 })
    .where("id", "=", existing.id)
    .execute();

  return { allowed: true, remaining: max - existing.count - 1, bypassed: false };
}
