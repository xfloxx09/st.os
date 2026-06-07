import { NextResponse } from "next/server";
import { getSessionFromCookies, SESSION_COOKIE } from "@/lib/auth/jwt";
import { getDb } from "@/lib/db";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const db = getDb();
  const history = await db
    .selectFrom("search_history")
    .select(["id", "contract_address", "token_symbol", "token_name", "searched_at"])
    .where("user_id", "=", session.userId)
    .orderBy("searched_at", "desc")
    .limit(20)
    .execute();

  return NextResponse.json({
    authenticated: true,
    user: {
      userId: session.userId,
      telegramId: session.telegramId,
      username: session.username,
      firstName: session.firstName,
    },
    searchHistory: history.map((row) => ({
      id: row.id,
      contractAddress: row.contract_address,
      tokenSymbol: row.token_symbol,
      tokenName: row.token_name,
      searchedAt: row.searched_at.toISOString(),
    })),
  });
}

export async function DELETE() {
  const session = await getSessionFromCookies();
  if (session) {
    const db = getDb();
    const cookieStore = await import("next/headers").then((m) => m.cookies());
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (token) {
      await db.deleteFrom("sessions").where("token", "=", token).execute();
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
