import { NextRequest, NextResponse } from "next/server";
import { analyzeContractAddress } from "@/lib/analyze/ca-analyzer";
import { scanForFishyWallets } from "@/lib/analyze/expose-scan";
import type { ExposeScanResult } from "@/lib/analyze/types";
import { hasActiveSubscription } from "@/lib/billing/subscription";
import { getAuthSession } from "@/lib/auth/session";
import {
  getCachedWalletData,
  setCachedWalletData,
} from "@/lib/cache/wallet-cache";
import { isValidEthAddress, normalizeAddress } from "@/lib/ethereum";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  const contract = request.nextUrl.searchParams.get("contract")?.trim();

  if (!contract || !isValidEthAddress(contract)) {
    return NextResponse.json({ error: "Invalid contract address" }, { status: 400 });
  }

  const normalized = normalizeAddress(contract);
  const isPro =
    session?.type === "user" &&
    (await hasActiveSubscription(session.userId));
  const fullScan = isPro && request.nextUrl.searchParams.get("full") !== "0";
  const cacheKey = `${normalized}|expose|${fullScan ? "full" : "basic"}`;
  const skipCache = request.nextUrl.searchParams.get("refresh") === "1";

  if (session?.type === "user") {
    const rate = await checkRateLimit(session.userId, "cross_analyze");
    if (!rate.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
    }
  }

  let result: ExposeScanResult | null = null;
  if (!skipCache) {
    result = await getCachedWalletData<ExposeScanResult>(cacheKey, "expose_scan");
  }

  if (!result) {
    try {
      const analysis = await analyzeContractAddress(normalized, { isPro });
      result = await scanForFishyWallets(
        normalized,
        analysis.overview,
        analysis.holders,
        { fullScan }
      );
      await setCachedWalletData(cacheKey, "expose_scan", result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Expose scan failed";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  } else {
    result = { ...result, cached: true };
  }

  return NextResponse.json({
    ...result,
    proRequired: !isPro,
  });
}
