import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { verifyHolderBalance } from "@/lib/billing/verify";
import { grantSubscription } from "@/lib/billing/subscription";
import type { PlanInterval } from "@/lib/billing/types";
import { normalizeAddress, isValidEthAddress } from "@/lib/ethereum";

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (!session || session.type !== "user") {
    return NextResponse.json({ error: "Telegram login required" }, { status: 401 });
  }

  const body = (await request.json()) as {
    plan?: PlanInterval;
    walletAddress?: string;
  };

  const plan = body.plan;
  const wallet = body.walletAddress?.trim();

  if (!plan || !["weekly", "monthly", "yearly"].includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }
  if (!wallet || !isValidEthAddress(wallet)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  const check = await verifyHolderBalance(wallet, plan);
  if (!check.ok) {
    return NextResponse.json({ error: check.error, ...check }, { status: 402 });
  }

  const expiresAt = await grantSubscription(session.userId, plan, "holder", {
    walletAddress: normalizeAddress(wallet),
    amountPaid: `${check.balance} tokens held`,
  });

  return NextResponse.json({
    ok: true,
    plan,
    expiresAt: expiresAt.toISOString(),
    message: "Holder access granted. Keep tokens in wallet for subscription period.",
  });
}
