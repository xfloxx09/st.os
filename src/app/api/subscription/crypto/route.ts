import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { verifyEthPayment } from "@/lib/billing/verify";
import { grantSubscription } from "@/lib/billing/subscription";
import type { PlanInterval } from "@/lib/billing/types";
import { getDb } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (!session || session.type !== "user") {
    return NextResponse.json({ error: "Telegram login required" }, { status: 401 });
  }

  const body = (await request.json()) as {
    plan?: PlanInterval;
    txHash?: string;
    fromWallet?: string;
  };

  const plan = body.plan;
  const txHash = body.txHash?.trim();

  if (!plan || !["weekly", "monthly", "yearly"].includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }
  if (!txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return NextResponse.json({ error: "Invalid transaction hash" }, { status: 400 });
  }

  const db = getDb();
  const used = await db
    .selectFrom("subscriptions")
    .select("id")
    .where("tx_hash", "=", txHash)
    .executeTakeFirst();

  if (used) {
    return NextResponse.json({ error: "Transaction already used" }, { status: 409 });
  }

  const check = await verifyEthPayment(txHash, plan, body.fromWallet);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: 402 });
  }

  const expiresAt = await grantSubscription(session.userId, plan, "crypto", {
    txHash,
    walletAddress: body.fromWallet,
  });

  return NextResponse.json({
    ok: true,
    plan,
    expiresAt: expiresAt.toISOString(),
  });
}
