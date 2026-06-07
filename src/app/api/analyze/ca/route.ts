import { NextRequest, NextResponse } from "next/server";
import { analyzeContractAddress } from "@/lib/analyze/ca-analyzer";
import type { CaAnalysisResult } from "@/lib/analyze/types";
import { getSessionFromCookies } from "@/lib/auth/jwt";
import {
  getCachedWalletData,
  setCachedWalletData,
} from "@/lib/cache/wallet-cache";
import { isValidEthAddress, normalizeAddress } from "@/lib/ethereum";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSearchHistory, recordSearch } from "@/lib/search-history";

export async function GET(request: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const address = request.nextUrl.searchParams.get("address")?.trim();
  if (!address || !isValidEthAddress(address)) {
    return NextResponse.json(
      { error: "Invalid Ethereum contract address" },
      { status: 400 }
    );
  }

  const normalized = normalizeAddress(address);
  const skipCache = request.nextUrl.searchParams.get("refresh") === "1";

  const rate = await checkRateLimit(session.userId, "analyze_ca");
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 }
    );
  }

  let result: CaAnalysisResult | null = null;

  if (!skipCache) {
    result = await getCachedWalletData<CaAnalysisResult>(
      normalized,
      "ca_analysis"
    );
  }

  if (!result) {
    try {
      result = await analyzeContractAddress(normalized);
      await setCachedWalletData(normalized, "ca_analysis", result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to analyze contract";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  } else {
    result = { ...result, cached: true };
  }

  await recordSearch(
    session.userId,
    normalized,
    result.overview.symbol,
    result.overview.name
  );

  const history = await getSearchHistory(session.userId);

  return NextResponse.json({
    ...result,
    rateLimitRemaining: rate.remaining,
    searchHistory: history.map((row) => ({
      id: row.id,
      contractAddress: row.contract_address,
      tokenSymbol: row.token_symbol,
      tokenName: row.token_name,
      searchedAt: row.searched_at.toISOString(),
    })),
  });
}
