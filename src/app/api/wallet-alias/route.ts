import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { isValidEthAddress, normalizeAddress } from "@/lib/ethereum";

export async function GET() {
  const session = await getAuthSession();
  if (!session || session.type !== "user") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const rows = await db
    .selectFrom("wallet_aliases")
    .select(["wallet_address", "nickname"])
    .where("user_id", "=", session.userId)
    .execute();

  const aliases: Record<string, string> = {};
  for (const row of rows) {
    aliases[normalizeAddress(row.wallet_address)] = row.nickname;
  }

  return NextResponse.json({ aliases });
}

export async function PUT(request: NextRequest) {
  const session = await getAuthSession();
  if (!session || session.type !== "user") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    walletAddress?: string;
    nickname?: string;
  };

  const wallet = body.walletAddress?.trim();
  const nickname = body.nickname?.trim() ?? "";

  if (!wallet || !isValidEthAddress(wallet)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  const normalized = normalizeAddress(wallet);
  const db = getDb();

  if (!nickname) {
    await db
      .deleteFrom("wallet_aliases")
      .where("user_id", "=", session.userId)
      .where("wallet_address", "=", normalized)
      .execute();
    return NextResponse.json({ walletAddress: normalized, nickname: null });
  }

  const row = await db
    .insertInto("wallet_aliases")
    .values({
      user_id: session.userId,
      wallet_address: normalized,
      nickname: nickname.slice(0, 80),
      updated_at: new Date(),
    })
    .onConflict((oc) =>
      oc.columns(["user_id", "wallet_address"]).doUpdateSet({
        nickname: nickname.slice(0, 80),
        updated_at: new Date(),
      })
    )
    .returning(["wallet_address", "nickname"])
    .executeTakeFirstOrThrow();

  await db
    .updateTable("tracked_wallets")
    .set({ label: nickname.slice(0, 100) })
    .where("user_id", "=", session.userId)
    .where("wallet_address", "=", normalized)
    .execute();

  return NextResponse.json({
    walletAddress: row.wallet_address,
    nickname: row.nickname,
  });
}
