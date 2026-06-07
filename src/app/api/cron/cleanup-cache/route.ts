import { NextRequest, NextResponse } from "next/server";
import { purgeExpiredCache } from "@/lib/cache/wallet-cache";
import { getDb } from "@/lib/db";

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deleted = await purgeExpiredCache();

  const db = getDb();
  const stale = await db
    .deleteFrom("wallet_cache")
    .where("cached_at", "<", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    .executeTakeFirst();

  return NextResponse.json({
    ok: true,
    expiredDeleted: deleted,
    staleDeleted: Number(stale.numDeletedRows ?? 0),
  });
}
