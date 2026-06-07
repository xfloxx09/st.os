import { NextRequest, NextResponse } from "next/server";
import { analyzeWallet } from "@/lib/analyze/wallet-analyzer";
import type { WalletProfile } from "@/lib/analyze/types";
import { getAuthSession } from "@/lib/auth/session";
import {
  getCachedWalletData,
  setCachedWalletData,
} from "@/lib/cache/wallet-cache";
import { isValidEthAddress, normalizeAddress } from "@/lib/ethereum";
import { checkRateLimit } from "@/lib/rate-limit";

function cacheKey(wallet: string, contract: string) {
  return `${wallet}|${contract}`;
}

export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.type === "guest") {
    return NextResponse.json(
      { error: "Connect Telegram to analyze wallets." },
      { status: 403 }
    );
  }

  const { hasActiveSubscription } = await import("@/lib/billing/subscription");
  if (!(await hasActiveSubscription(session.userId))) {
    return NextResponse.json(
      { error: "EXPOSED.OS Pro required for wallet deep-dive. See /pricing" },
      { status: 402 }
    );
  }

  const wallet = request.nextUrl.searchParams.get("wallet")?.trim();
  const contract = request.nextUrl.searchParams.get("contract")?.trim();
  const percent = request.nextUrl.searchParams.get("percent");

  if (!wallet || !contract || !isValidEthAddress(wallet) || !isValidEthAddress(contract)) {
    return NextResponse.json({ error: "Invalid wallet or contract address" }, { status: 400 });
  }

  const normalizedWallet = normalizeAddress(wallet);
  const normalizedContract = normalizeAddress(contract);
  const key = cacheKey(normalizedWallet, normalizedContract);
  const skipCache = request.nextUrl.searchParams.get("refresh") === "1";

  const rate = await checkRateLimit(session.userId, "stalk_wallet");
  if (!rate.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  let result: WalletProfile | null = null;
  if (!skipCache) {
    result = await getCachedWalletData<WalletProfile>(key, "profile");
  }

  if (!result) {
    try {
      result = await analyzeWallet(
        normalizedWallet,
        normalizedContract,
        percent ? Number(percent) : null
      );
      await setCachedWalletData(key, "profile", result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Wallet analysis failed";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  } else {
    result = { ...result, cached: true };
  }

  return NextResponse.json({ ...result, rateLimitRemaining: rate.remaining });
}
