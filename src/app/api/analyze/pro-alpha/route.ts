import { NextRequest, NextResponse } from "next/server";
import { analyzeContractAddress } from "@/lib/analyze/ca-analyzer";
import { scanProAlphaTargets } from "@/lib/analyze/pro-alpha-scan";
import type { ProAlphaScanResult } from "@/lib/analyze/types";
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
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contract = request.nextUrl.searchParams.get("contract")?.trim();
  if (!contract || !isValidEthAddress(contract)) {
    return NextResponse.json({ error: "Invalid contract address" }, { status: 400 });
  }

  const isPro =
    session.type === "user" &&
    (await hasActiveSubscription(session.userId));

  if (!isPro) {
    return NextResponse.json(
      { error: "EXPOSED.OS Pro required for alpha track scan. See /pricing" },
      { status: 402 }
    );
  }

  const normalized = normalizeAddress(contract);
  const cacheKey = `${normalized}|pro_alpha|v2`;
  const skipCache = request.nextUrl.searchParams.get("refresh") === "1";

  if (!skipCache) {
    const cached = await getCachedWalletData<ProAlphaScanResult>(
      cacheKey,
      "pro_alpha"
    );
    if (cached) {
      return NextResponse.json({ ...cached, cached: true });
    }
  }

  const rate = await checkRateLimit(session.userId, "cross_analyze");
  if (!rate.allowed) {
    return NextResponse.json(
      { error: rateLimitErrorMessage("cross_analyze") },
      { status: 429 }
    );
  }

  try {
    const analysis = await analyzeContractAddress(normalized, { isPro: true });
    const result = await scanProAlphaTargets(
      normalized,
      analysis.overview,
      analysis.holders
    );
    await setCachedWalletData(cacheKey, "pro_alpha", result);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Pro alpha scan failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
