import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  SESSION_COOKIE,
  createUserSessionToken,
  userSessionExpiryDate,
} from "@/lib/auth/session";
import {
  verifyTelegramAuth,
  type TelegramAuthPayload,
} from "@/lib/auth/telegram";

export async function POST(request: NextRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: "Telegram auth not configured" }, { status: 500 });
  }

  let body: TelegramAuthPayload;
  try {
    body = (await request.json()) as TelegramAuthPayload;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (!verifyTelegramAuth(body, botToken)) {
    return NextResponse.json({ error: "Invalid Telegram auth" }, { status: 401 });
  }

  const db = getDb();

  const existing = await db
    .selectFrom("users")
    .selectAll()
    .where("telegram_id", "=", body.id)
    .executeTakeFirst();

  let userId: number;

  if (existing) {
    await db
      .updateTable("users")
      .set({
        telegram_username: body.username ?? null,
        telegram_first_name: body.first_name ?? null,
        last_active: new Date(),
      })
      .where("id", "=", existing.id)
      .execute();
    userId = existing.id;
  } else {
    const inserted = await db
      .insertInto("users")
      .values({
        telegram_id: body.id,
        telegram_username: body.username ?? null,
        telegram_first_name: body.first_name ?? null,
      })
      .returning("id")
      .executeTakeFirstOrThrow();
    userId = inserted.id;
  }

  const token = await createUserSessionToken({
    sub: String(body.id),
    userId,
    telegramId: body.id,
    username: body.username,
    firstName: body.first_name,
  });

  const expiresAt = userSessionExpiryDate();

  await db
    .insertInto("sessions")
    .values({
      user_id: userId,
      token,
      expires_at: expiresAt,
    })
    .execute();

  const response = NextResponse.json({
    ok: true,
    user: {
      userId,
      telegramId: body.id,
      username: body.username,
      firstName: body.first_name,
    },
  });

  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return response;
}
