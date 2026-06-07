import { NextRequest, NextResponse } from "next/server";
import {
  buildWalletNetwork,
  type NetworkWindow,
} from "@/lib/analyze/wallet-network";
import type { WalletNetworkResult } from "@/lib/analyze/types";
import { hasActiveSubscription } from "@/lib/billing/subscription";
import { getAuthSession } from "@/lib/auth/session";
import {
  getCachedWalletData,
  setCachedWalletData,
} from "@/lib/cache/wallet-cache";
import { isValidEthAddress, normalizeAddress } from "@/lib/ethereum";
import { checkRateLimit, rateLimitErrorMessage } from "@/lib/rate-limit";

function cacheKey(wallet: string, windowDays: number) {
  return `${normalizeAddress(wallet)}|network|${windowDays}`;
}

export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  if (!session || session.type !== "user") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasActiveSubscription(session.userId))) {
    return NextResponse.json(
      { error: "EXPOSED.OS Pro required for wallet network map. See /pricing" },
      { status: 402 }
    );
  }

  const wallet = request.nextUrl.searchParams.get("wallet")?.trim();
  const contract = request.nextUrl.searchParams.get("contract")?.trim();
  const windowParam = Number(request.nextUrl.searchParams.get("window") ?? "90");
  const windowDays: NetworkWindow = windowParam === 30 ? 30 : 90;

  if (!wallet || !isValidEthAddress(wallet)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  if (contract && !isValidEthAddress(contract)) {
    return NextResponse.json({ error: "Invalid contract address" }, { status: 400 });
  }

  const key = cacheKey(wallet, windowDays);
  const skipCache = request.nextUrl.searchParams.get("refresh") === "1";

  let result: WalletNetworkResult | null = null;
  if (!skipCache) {
    result = await getCachedWalletData<WalletNetworkResult>(key, "wallet_network");
  }

  if (result) {
    return NextResponse.json({ ...result, cached: true });
  }

  const rate = await checkRateLimit(session.userId, "cross_analyze");
  if (!rate.allowed) {
    return NextResponse.json(
      { error: rateLimitErrorMessage("cross_analyze") },
      { status: 429 }
    );
  }

  try {
    result = await buildWalletNetwork(wallet, windowDays, contract ?? null);
    await setCachedWalletData(key, "wallet_network", result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network analysis failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ ...result, rateLimitRemaining: rate.remaining });
}
