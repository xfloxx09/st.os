import { NextRequest, NextResponse } from "next/server";
import { analyzeContractAddress } from "@/lib/analyze/ca-analyzer";
import { traceTokenFunds } from "@/lib/analyze/fund-tracer";
import type { FundTraceResult } from "@/lib/analyze/types";
import { hasActiveSubscription } from "@/lib/billing/subscription";
import { getAuthSession } from "@/lib/auth/session";
import {
  getCachedWalletData,
  setCachedWalletData,
} from "@/lib/cache/wallet-cache";
import { isValidEthAddress, normalizeAddress } from "@/lib/ethereum";
import { checkRateLimit, rateLimitErrorMessage } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  if (!session || session.type !== "user") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasActiveSubscription(session.userId))) {
    return NextResponse.json(
      { error: "EXPOSED.OS Pro required for fund tracing. See /pricing" },
      { status: 402 }
    );
  }

  const contract = request.nextUrl.searchParams.get("contract")?.trim();
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "20");

  if (!contract || !isValidEthAddress(contract)) {
    return NextResponse.json({ error: "Invalid contract address" }, { status: 400 });
  }

  const normalized = normalizeAddress(contract);
  const cacheKey = `${normalized}|fund`;
  const skipCache = request.nextUrl.searchParams.get("refresh") === "1";

  let result: FundTraceResult | null = null;
  if (!skipCache) {
    result = await getCachedWalletData<FundTraceResult>(cacheKey, "fund_origin");
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
    const isPro = await hasActiveSubscription(session.userId);
    const analysis = await analyzeContractAddress(normalized, { isPro });
    result = await traceTokenFunds(
      normalized,
      analysis.holders,
      analysis.overview.symbol,
      Math.min(30, Math.max(5, limit))
    );
    await setCachedWalletData(cacheKey, "fund_origin", result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fund trace failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ ...result, rateLimitRemaining: rate.remaining });
}
