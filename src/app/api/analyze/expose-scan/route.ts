import { NextRequest, NextResponse } from "next/server";
import { loadCaAnalysis } from "@/lib/analyze/load-ca-analysis";
import { scanForExposedWallets } from "@/lib/analyze/expose-scan";
import type { ExposeScanResult } from "@/lib/analyze/types";
import { hasActiveSubscription } from "@/lib/billing/subscription";
import { getAuthSession } from "@/lib/auth/session";
import {
  getCachedWalletData,
  setCachedWalletData,
} from "@/lib/cache/wallet-cache";
import { isValidEthAddress, normalizeAddress } from "@/lib/ethereum";
import { checkRateLimit, rateLimitErrorMessage } from "@/lib/rate-limit";

export const maxDuration = 120;

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
  const cacheKey = `${normalized}|expose|v2|${fullScan ? "full" : "basic"}`;
  const skipCache = request.nextUrl.searchParams.get("refresh") === "1";

  let result: ExposeScanResult | null = null;
  if (!skipCache) {
    result = await getCachedWalletData<ExposeScanResult>(cacheKey, "expose_scan");
  }

  if (result) {
    return NextResponse.json({
      ...result,
      cached: true,
      proRequired: !isPro,
    });
  }

  if (session?.type === "user") {
    const rate = await checkRateLimit(session.userId, "expose_scan");
    if (!rate.allowed) {
      return NextResponse.json(
        { error: rateLimitErrorMessage("expose_scan") },
        { status: 429 }
      );
    }
  }

  try {
    const analysis = await loadCaAnalysis(normalized, { isPro });
    result = await scanForExposedWallets(
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

  return NextResponse.json({
    ...result,
    proRequired: !isPro,
  });
}
