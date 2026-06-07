import { NextRequest, NextResponse } from "next/server";
import { analyzeContractAddress } from "@/lib/analyze/ca-analyzer";
import type { CaAnalysisResult } from "@/lib/analyze/types";
import { incrementGuestSearches } from "@/lib/auth/guest";
import { getAuthSession } from "@/lib/auth/session";
import {
  getCachedWalletData,
  setCachedWalletData,
} from "@/lib/cache/wallet-cache";
import { isValidEthAddress, normalizeAddress } from "@/lib/ethereum";
import { checkRateLimit, rateLimitErrorMessage } from "@/lib/rate-limit";
import { getSearchHistory, recordSearch } from "@/lib/search-history";
import { hasActiveSubscription } from "@/lib/billing/subscription";

export async function GET(request: NextRequest) {
  const session = await getAuthSession();
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

  let result: CaAnalysisResult | null = null;

  if (!skipCache) {
    const cached = await getCachedWalletData<CaAnalysisResult>(
      normalized,
      "ca_analysis"
    );
    if (cached && cached.allHolders.length > 0) {
      result = { ...cached, cached: true };
    }
  }

  const isPro =
    session.type === "user" && (await hasActiveSubscription(session.userId));

  if (!result) {
    if (session.type === "guest") {
      if (session.searchesRemaining <= 0) {
        return NextResponse.json(
          {
            error: "Guest search limit reached (5). Connect Telegram for unlimited access.",
          },
          { status: 429 }
        );
      }
    } else {
      const rate = await checkRateLimit(session.userId, "analyze_ca");
      if (!rate.allowed) {
        return NextResponse.json(
          { error: rateLimitErrorMessage("analyze_ca") },
          { status: 429 }
        );
      }
    }
    try {
      result = await analyzeContractAddress(normalized, { isPro });
      await setCachedWalletData(normalized, "ca_analysis", result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to analyze contract";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  let guestMeta = null;
  let searchHistory: Array<{
    id: number;
    contractAddress: string;
    tokenSymbol: string | null;
    tokenName: string | null;
    searchedAt: string;
  }> = [];

  if (session.type === "guest") {
    const used = await incrementGuestSearches(session.guestId);
    guestMeta = {
      guestId: session.guestId,
      searchesUsed: used,
      searchesRemaining: Math.max(0, 5 - used),
      searchesLimit: 5,
    };
  } else {
    await recordSearch(
      session.userId,
      normalized,
      result.overview.symbol,
      result.overview.name
    );
    const history = await getSearchHistory(session.userId);
    searchHistory = history.map((row) => ({
      id: row.id,
      contractAddress: row.contract_address,
      tokenSymbol: row.token_symbol,
      tokenName: row.token_name,
      searchedAt: row.searched_at.toISOString(),
    }));
  }

  return NextResponse.json({
    ...result,
    guest: guestMeta,
    searchHistory,
  });
}
