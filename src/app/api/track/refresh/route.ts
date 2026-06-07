import { NextRequest, NextResponse } from "next/server";
import { buildWalletTrackSnapshot } from "@/lib/analyze/wallet-tracker";
import { hasActiveSubscription } from "@/lib/billing/subscription";
import { getAuthSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { isValidEthAddress, normalizeAddress } from "@/lib/ethereum";
import { checkRateLimit, rateLimitErrorMessage } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  if (!session || session.type !== "user") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasActiveSubscription(session.userId))) {
    return NextResponse.json(
      { error: "EXPOSED.OS Pro required. See /pricing" },
      { status: 402 }
    );
  }

  const wallet = request.nextUrl.searchParams.get("wallet")?.trim();
  const contract = request.nextUrl.searchParams.get("contract")?.trim();
  const percent = request.nextUrl.searchParams.get("percent");

  if (!wallet || !isValidEthAddress(wallet)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  if (contract && !isValidEthAddress(contract)) {
    return NextResponse.json({ error: "Invalid contract address" }, { status: 400 });
  }

  const rate = await checkRateLimit(session.userId, "stalk_wallet");
  if (!rate.allowed) {
    return NextResponse.json(
      { error: rateLimitErrorMessage("stalk_wallet") },
      { status: 429 }
    );
  }

  const normalized = normalizeAddress(wallet);
  const db = getDb();
  const tracked = await db
    .selectFrom("tracked_wallets")
    .select(["label", "source_contract"])
    .where("user_id", "=", session.userId)
    .where("wallet_address", "=", normalized)
    .executeTakeFirst();

  const sourceContract = contract
    ? normalizeAddress(contract)
    : tracked?.source_contract ?? null;

  try {
    const snapshot = await buildWalletTrackSnapshot(
      normalized,
      sourceContract,
      percent ? Number(percent) : null,
      tracked?.label
    );

    await db
      .updateTable("tracked_wallets")
      .set({ last_checked_at: new Date() })
      .where("user_id", "=", session.userId)
      .where("wallet_address", "=", normalized)
      .execute();

    return NextResponse.json({ ...snapshot, rateLimitRemaining: rate.remaining });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Track refresh failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
