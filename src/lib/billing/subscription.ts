import { getDb } from "@/lib/db";
import type { PlanInterval } from "@/lib/billing/types";

const PLAN_DAYS: Record<PlanInterval, number> = {
  weekly: 7,
  monthly: 30,
  yearly: 365,
};

export async function hasActiveSubscription(userId: number): Promise<boolean> {
  const db = getDb();
  const row = await db
    .selectFrom("subscriptions")
    .select("id")
    .where("user_id", "=", userId)
    .where("status", "=", "active")
    .where("expires_at", ">", new Date())
    .executeTakeFirst();

  return Boolean(row);
}

export async function grantSubscription(
  userId: number,
  plan: PlanInterval,
  paymentMethod: "crypto" | "holder",
  opts?: { txHash?: string; walletAddress?: string; amountPaid?: string }
): Promise<Date> {
  const db = getDb();
  const startsAt = new Date();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + PLAN_DAYS[plan]);

  await db
    .insertInto("subscriptions")
    .values({
      user_id: userId,
      plan,
      payment_method: paymentMethod,
      status: "active",
      tx_hash: opts?.txHash ?? null,
      wallet_address: opts?.walletAddress ?? null,
      amount_paid: opts?.amountPaid ?? null,
      starts_at: startsAt,
      expires_at: expiresAt,
    })
    .execute();

  await db
    .updateTable("users")
    .set({ plan: "pro", wallet_address: opts?.walletAddress ?? null })
    .where("id", "=", userId)
    .execute();

  return expiresAt;
}

export async function isAdmin(userId: number): Promise<boolean> {
  const db = getDb();
  const user = await db
    .selectFrom("users")
    .select(["role"])
    .where("id", "=", userId)
    .executeTakeFirst();
  return user?.role === "admin";
}
