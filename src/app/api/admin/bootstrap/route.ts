import { NextRequest, NextResponse } from "next/server";
import { grantAdminAccess } from "@/lib/billing/subscription";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  const secret = process.env.ADMIN_BOOTSTRAP_KEY ?? "ca-os-admin-bootstrap-2026";

  if (key !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const telegramId = Number(
    request.nextUrl.searchParams.get("telegram_id") ?? "0"
  );
  if (!telegramId) {
    return NextResponse.json(
      { error: "Pass telegram_id=YOUR_TELEGRAM_ID after logging in once" },
      { status: 400 }
    );
  }

  const db = getDb();
  const user = await db
    .selectFrom("users")
    .selectAll()
    .where("telegram_id", "=", telegramId)
    .executeTakeFirst();

  if (!user) {
    return NextResponse.json(
      { error: "User not found. Log in with Telegram first, then bootstrap." },
      { status: 404 }
    );
  }

  await grantAdminAccess(user.id);

  return NextResponse.json({
    ok: true,
    message: "Admin + Pro granted",
    userId: user.id,
    adminUrl: "/admin",
    isPro: true,
  });
}
