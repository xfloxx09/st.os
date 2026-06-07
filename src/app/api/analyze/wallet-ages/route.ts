import { NextRequest, NextResponse } from "next/server";
import { resolveWalletAges } from "@/lib/analyze/wallet-freshness";
import { getAuthSession } from "@/lib/auth/session";
import { isValidEthAddress, normalizeAddress } from "@/lib/ethereum";
import { checkRateLimit, rateLimitErrorMessage } from "@/lib/rate-limit";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.type === "guest") {
    return NextResponse.json(
      { error: "Connect Telegram to check wallet age." },
      { status: 403 }
    );
  }

  const raw = request.nextUrl.searchParams.get("addresses")?.trim() ?? "";
  const addresses = raw
    .split(",")
    .map((a) => a.trim())
    .filter((a) => isValidEthAddress(a))
    .slice(0, 80);

  if (addresses.length === 0) {
    return NextResponse.json({ error: "No valid addresses" }, { status: 400 });
  }

  const rate = await checkRateLimit(session.userId, "stalk_wallet");
  if (!rate.allowed) {
    return NextResponse.json(
      { error: rateLimitErrorMessage("stalk_wallet") },
      { status: 429 }
    );
  }

  try {
    const ages = await resolveWalletAges(addresses, 5);
    const normalized: Record<string, (typeof ages)[string]> = {};
    for (const [key, value] of Object.entries(ages)) {
      normalized[normalizeAddress(key).toLowerCase()] = value;
    }
    return NextResponse.json({ ages: normalized, fetchedAt: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Wallet age lookup failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
