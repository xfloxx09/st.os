import { NextResponse } from "next/server";
import {
  createGuestSession,
  GUEST_SEARCH_LIMIT,
  guestExpiryDate,
} from "@/lib/auth/guest";
import {
  createGuestSessionToken,
  SESSION_COOKIE,
} from "@/lib/auth/session";

export async function POST() {
  const { guestId } = await createGuestSession();
  const token = await createGuestSessionToken(guestId);
  const expiresAt = guestExpiryDate();

  const response = NextResponse.json({
    ok: true,
    guest: {
      guestId,
      searchesUsed: 0,
      searchesRemaining: GUEST_SEARCH_LIMIT,
      searchesLimit: GUEST_SEARCH_LIMIT,
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
