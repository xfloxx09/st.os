import { NextResponse } from "next/server";
import { deleteGuestSession } from "@/lib/auth/guest";
import {
  getAuthSession,
  SESSION_COOKIE,
} from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getSearchHistory } from "@/lib/search-history";
import { hasActiveSubscription, isAdmin } from "@/lib/billing/subscription";

export async function GET() {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  if (session.type === "guest") {
    return NextResponse.json({
      authenticated: true,
      guest: {
        guestId: session.guestId,
        searchesUsed: session.searchesUsed,
        searchesRemaining: session.searchesRemaining,
        searchesLimit: session.searchesLimit,
      },
      searchHistory: [],
    });
  }

  const history = await getSearchHistory(session.userId);
  const pro = await hasActiveSubscription(session.userId);
  const admin = await isAdmin(session.userId);

  return NextResponse.json({
    authenticated: true,
    user: {
      userId: session.userId,
      telegramId: session.telegramId,
      username: session.username,
      firstName: session.firstName,
      isPro: pro,
      isAdmin: admin,
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
  const session = await getAuthSession();
  const cookieStore = await import("next/headers").then((m) => m.cookies());
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (session?.type === "user" && token) {
    const db = getDb();
    await db.deleteFrom("sessions").where("token", "=", token).execute();
  }

  if (session?.type === "guest") {
    await deleteGuestSession(session.guestId);
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
