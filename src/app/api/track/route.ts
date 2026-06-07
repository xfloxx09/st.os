import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { isValidEthAddress, normalizeAddress } from "@/lib/ethereum";
import { hasActiveSubscription } from "@/lib/billing/subscription";

export async function GET() {
  const session = await getAuthSession();
  if (!session || session.type !== "user") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const rows = await db
    .selectFrom("tracked_wallets")
    .selectAll()
    .where("user_id", "=", session.userId)
    .orderBy("created_at", "desc")
    .execute();

  return NextResponse.json({
    wallets: rows.map((row) => ({
      id: row.id,
      walletAddress: row.wallet_address,
      label: row.label,
      sourceContract: row.source_contract,
      notes: row.notes,
      createdAt: row.created_at.toISOString(),
      lastCheckedAt: row.last_checked_at?.toISOString() ?? null,
    })),
  });
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (!session || session.type !== "user") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasActiveSubscription(session.userId))) {
    return NextResponse.json(
      { error: "EXPOSED.OS Pro required to track wallets. See /pricing" },
      { status: 402 }
    );
  }

  const body = (await request.json()) as {
    walletAddress?: string;
    label?: string;
    sourceContract?: string;
    notes?: string;
  };

  const wallet = body.walletAddress?.trim();
  if (!wallet || !isValidEthAddress(wallet)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  const normalized = normalizeAddress(wallet);
  const sourceContract = body.sourceContract?.trim();
  if (sourceContract && !isValidEthAddress(sourceContract)) {
    return NextResponse.json({ error: "Invalid contract address" }, { status: 400 });
  }

  const db = getDb();
  const row = await db
    .insertInto("tracked_wallets")
    .values({
      user_id: session.userId,
      wallet_address: normalized,
      label: body.label?.slice(0, 100) ?? null,
      source_contract: sourceContract ? normalizeAddress(sourceContract) : null,
      notes: body.notes?.slice(0, 500) ?? null,
    })
    .onConflict((oc) =>
      oc.columns(["user_id", "wallet_address"]).doUpdateSet({
        label: body.label?.slice(0, 100) ?? null,
        source_contract: sourceContract ? normalizeAddress(sourceContract) : null,
        notes: body.notes?.slice(0, 500) ?? null,
      })
    )
    .returningAll()
    .executeTakeFirstOrThrow();

  return NextResponse.json({
    wallet: {
      id: row.id,
      walletAddress: row.wallet_address,
      label: row.label,
      sourceContract: row.source_contract,
      notes: row.notes,
      createdAt: row.created_at.toISOString(),
      lastCheckedAt: row.last_checked_at?.toISOString() ?? null,
    },
  });
}

export async function DELETE(request: NextRequest) {
  const session = await getAuthSession();
  if (!session || session.type !== "user") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const wallet = request.nextUrl.searchParams.get("wallet")?.trim();
  if (!wallet || !isValidEthAddress(wallet)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  const db = getDb();
  await db
    .deleteFrom("tracked_wallets")
    .where("user_id", "=", session.userId)
    .where("wallet_address", "=", normalizeAddress(wallet))
    .execute();

  return NextResponse.json({ ok: true });
}
