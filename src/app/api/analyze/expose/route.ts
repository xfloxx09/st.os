import { NextRequest, NextResponse } from "next/server";
import { analyzeContractAddress } from "@/lib/analyze/ca-analyzer";
import { bulkExposeWallets } from "@/lib/analyze/bulk-expose";
import { scanForExposedWallets } from "@/lib/analyze/expose-scan";
import type { BulkExposeResult } from "@/lib/analyze/types";
import { hasActiveSubscription } from "@/lib/billing/subscription";
import { getAuthSession } from "@/lib/auth/session";
import {
  getCachedWalletData,
  setCachedWalletData,
} from "@/lib/cache/wallet-cache";
import { isValidEthAddress, normalizeAddress } from "@/lib/ethereum";
import { checkRateLimit, rateLimitErrorMessage } from "@/lib/rate-limit";
import type { NetworkWindow } from "@/lib/analyze/wallet-network";

export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  if (!session || session.type !== "user") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasActiveSubscription(session.userId))) {
    return NextResponse.json(
      { error: "EXPOSED.OS Pro required for bulk expose. See /pricing" },
      { status: 402 }
    );
  }

  const contract = request.nextUrl.searchParams.get("contract")?.trim();
  const windowParam = Number(request.nextUrl.searchParams.get("window") ?? "90");
  const windowDays: NetworkWindow = windowParam === 30 ? 30 : 90;

  if (!contract || !isValidEthAddress(contract)) {
    return NextResponse.json({ error: "Invalid contract address" }, { status: 400 });
  }

  const normalized = normalizeAddress(contract);
  const cacheKey = `${normalized}|bulk|${windowDays}`;
  const skipCache = request.nextUrl.searchParams.get("refresh") === "1";

  let result: BulkExposeResult | null = null;
  if (!skipCache) {
    result = await getCachedWalletData<BulkExposeResult>(cacheKey, "bulk_expose");
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
    const scan = await scanForExposedWallets(
      normalized,
      analysis.overview,
      analysis.holders,
      { fullScan: true }
    );

    if (scan.exposedWallets.length === 0) {
      return NextResponse.json(
        { error: "No exposed wallets flagged for this token." },
        { status: 404 }
      );
    }

    result = await bulkExposeWallets(
      normalized,
      scan.exposedWallets,
      windowDays
    );
    await setCachedWalletData(cacheKey, "bulk_expose", result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bulk expose failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ ...result, rateLimitRemaining: rate.remaining });
}
