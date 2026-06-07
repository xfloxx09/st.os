import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "exposed_session";
const LEGACY_SESSION_COOKIES = ["ca_session", "stalker_session"];
const PROTECTED_PREFIXES = ["/api/analyze"];

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
  if (!isProtected) return NextResponse.next();

  let token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    for (const name of LEGACY_SESSION_COOKIES) {
      token = request.cookies.get(name)?.value;
      if (token) break;
    }
  }
  const secret = getSecret();

  if (!token || !secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export const config = {
  matcher: ["/api/analyze/:path*"],
};
