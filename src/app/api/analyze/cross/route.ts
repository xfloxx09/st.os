import { NextRequest, NextResponse } from "next/server";
import { runCrossAnalysis } from "@/lib/analyze/cross-analysis";
import type { CrossAnalysisResult } from "@/lib/analyze/types";
import { hasActiveSubscription } from "@/lib/billing/subscription";
import { getAuthSession } from "@/lib/auth/session";
import {
  getCachedWalletData,
  setCachedWalletData,
} from "@/lib/cache/wallet-cache";
import { isValidEthAddress, normalizeAddress } from "@/lib/ethereum";
import { checkRateLimit, rateLimitErrorMessage } from "@/lib/rate-limit";

function crossCacheKey(contracts: string[]) {
  return contracts
    .map((c) => normalizeAddress(c))
    .sort()
    .join("|");
}

export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  if (!session || session.type !== "user") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasActiveSubscription(session.userId))) {
    return NextResponse.json(
      { error: "EXPOSED.OS Pro required for cross-analysis. See /pricing" },
      { status: 402 }
    );
  }

  const raw = request.nextUrl.searchParams.get("contracts")?.trim();
  if (!raw) {
    return NextResponse.json(
      { error: "Pass contracts=0x...,0x... (2-5 addresses)" },
      { status: 400 }
    );
  }

  const contracts = raw
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  if (contracts.length < 2 || contracts.length > 5) {
    return NextResponse.json(
      { error: "Provide between 2 and 5 contract addresses" },
      { status: 400 }
    );
  }

  for (const contract of contracts) {
    if (!isValidEthAddress(contract)) {
      return NextResponse.json({ error: `Invalid address: ${contract}` }, { status: 400 });
    }
  }

  const key = crossCacheKey(contracts);
  const skipCache = request.nextUrl.searchParams.get("refresh") === "1";
  const isPro = await hasActiveSubscription(session.userId);

  let result: CrossAnalysisResult | null = null;
  if (!skipCache) {
    result = await getCachedWalletData<CrossAnalysisResult>(key, "cross_analysis");
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
    result = await runCrossAnalysis(contracts, { isPro });
    await setCachedWalletData(key, "cross_analysis", result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cross-analysis failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ ...result, rateLimitRemaining: rate.remaining });
}
