import { NextRequest, NextResponse } from "next/server";
import { generateProAlphaBrief } from "@/lib/ai/pro-alpha-brief";
import { loadCaAnalysis } from "@/lib/analyze/load-ca-analysis";
import type { ProAlphaAiResult, ProAlphaScanResult } from "@/lib/analyze/types";
import { hasActiveSubscription } from "@/lib/billing/subscription";
import { getAuthSession } from "@/lib/auth/session";
import {
  getCachedWalletData,
  setCachedWalletData,
} from "@/lib/cache/wallet-cache";
import { isValidEthAddress, normalizeAddress } from "@/lib/ethereum";
import { checkRateLimit, rateLimitErrorMessage } from "@/lib/rate-limit";

export const maxDuration = 60;

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
      { error: "EXPOSED.OS Pro required for AI brief. See /pricing" },
      { status: 402 }
    );
  }

  const normalized = normalizeAddress(contract);
  const cacheKey = `${normalized}|pro_alpha_ai|v1`;
  const skipCache = request.nextUrl.searchParams.get("refresh") === "1";

  if (!skipCache) {
    const cached = await getCachedWalletData<ProAlphaAiResult>(
      cacheKey,
      "pro_alpha_ai"
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
    const scanKey = `${normalized}|pro_alpha|v4`;
    let scan = await getCachedWalletData<ProAlphaScanResult>(scanKey, "pro_alpha");
    const analysis = await loadCaAnalysis(normalized, { isPro: true });

    if (!scan) {
      const { scanProAlphaTargets } = await import("@/lib/analyze/pro-alpha-scan");
      scan = await scanProAlphaTargets(
        normalized,
        analysis.overview,
        analysis.holders
      );
      await setCachedWalletData(scanKey, "pro_alpha", scan);
    }

    const brief = await generateProAlphaBrief(scan, analysis.overview);
    const result: ProAlphaAiResult = {
      contractAddress: normalized,
      tokenSymbol: scan.tokenSymbol,
      deployer: scan.deployer,
      brief,
      fetchedAt: new Date().toISOString(),
      cached: false,
    };

    await setCachedWalletData(cacheKey, "pro_alpha_ai", result);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI brief failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
