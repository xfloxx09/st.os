import type {
  ExposeScanResult,
  ExposedWallet,
  HolderEntry,
  SharedFundSource,
  TokenOverview,
} from "@/lib/analyze/types";
import { traceTokenFunds } from "@/lib/analyze/fund-tracer";
import { fetchTopTraders } from "@/lib/analyze/token-traders";
import { normalizeAddress } from "@/lib/ethereum";
import { getAddressLabel } from "@/lib/labels";

function exposeTier(score: number): ExposedWallet["tier"] {
  if (score >= 75) return "CRITICAL";
  if (score >= 55) return "HIGH";
  if (score >= 35) return "MEDIUM";
  return "LOW";
}

function scoreBasicHolders(
  holders: HolderEntry[],
  overview: TokenOverview
): ExposedWallet[] {
  const deployer = overview.deployer
    ? normalizeAddress(overview.deployer)
    : null;
  const results: ExposedWallet[] = [];

  for (const holder of holders.filter((h) => !h.excluded).slice(0, 40)) {
    let score = 0;
    const reasons: string[] = [];
    const flags: string[] = [];

    if (holder.percentOfSupply >= 8) {
      score += 22;
      reasons.push(`Whale: ${holder.percentOfSupply.toFixed(1)}% of supply`);
    } else if (holder.percentOfSupply >= 3) {
      score += 12;
      reasons.push(`Large holder: ${holder.percentOfSupply.toFixed(1)}% supply`);
    }

    if (!holder.label && holder.percentOfSupply >= 1.5) {
      score += 14;
      reasons.push("Unlabeled wallet with significant stake");
      flags.push("UNLABELED_WHALE");
    }

    if (deployer && normalizeAddress(holder.address) === deployer) {
      score += 30;
      reasons.push("Deployer wallet still holding");
      flags.push("DEPLOYER");
    }

    if (holder.rank <= 5 && holder.percentOfSupply >= 2) {
      score += 8;
      reasons.push(`Top-${holder.rank} holder concentration`);
    }

    if (score >= 20) {
      results.push({
        address: normalizeAddress(holder.address),
        label: holder.label ?? getAddressLabel(holder.address),
        holderRank: holder.rank,
        percentOfSupply: holder.percentOfSupply,
        exposeScore: Math.min(100, score),
        tier: exposeTier(score),
        reasons,
        flags,
        sharedFundWith: [],
      });
    }
  }

  return results.sort((a, b) => b.exposeScore - a.exposeScore);
}

function mergeFundTraceScores(
  basic: ExposedWallet[],
  sharedSources: SharedFundSource[],
  entries: Awaited<ReturnType<typeof traceTokenFunds>>["entries"]
): ExposedWallet[] {
  const byAddress = new Map<string, ExposedWallet>();

  for (const exposed of basic) {
    byAddress.set(exposed.address, {
      ...exposed,
      reasons: [...exposed.reasons],
      flags: [...exposed.flags],
    });
  }

  for (const source of sharedSources) {
    for (const holderAddr of source.holderAddresses) {
      const key = normalizeAddress(holderAddr);
      const existing = byAddress.get(key) ?? {
        address: key,
        label: getAddressLabel(key),
        holderRank: null,
        percentOfSupply: null,
        exposeScore: 0,
        tier: "LOW" as const,
        reasons: [] as string[],
        flags: [] as string[],
        sharedFundWith: [] as string[],
      };

      existing.exposeScore = Math.min(
        100,
        existing.exposeScore + Math.round(source.suspicionScore * 0.45)
      );
      existing.tier = exposeTier(existing.exposeScore);
      existing.reasons.push(
        `Shares funding source with ${source.holderAddresses.length - 1} other holder(s)`
      );
      existing.flags.push("SHARED_FUND");
      existing.sharedFundWith = [
        ...new Set([
          ...existing.sharedFundWith,
          ...source.holderAddresses.filter((a) => normalizeAddress(a) !== key),
        ]),
      ];
      byAddress.set(key, existing);
    }
  }

  for (const entry of entries) {
    const key = normalizeAddress(entry.holderAddress);
    const existing = byAddress.get(key);
    if (!existing) continue;

    if (entry.fundOrigin.flags.length > 0) {
      existing.exposeScore = Math.min(100, existing.exposeScore + 28);
      existing.flags.push(...entry.fundOrigin.flags);
      existing.reasons.push(entry.fundOrigin.flags[0]);
    }

    if (entry.fundOrigin.hops >= 4) {
      existing.exposeScore = Math.min(100, existing.exposeScore + 12);
      existing.reasons.push(`Deep fund chain (${entry.fundOrigin.hops} hops)`);
      existing.flags.push("DEEP_CHAIN");
    }

    existing.holderRank = entry.holderRank;
    existing.percentOfSupply = entry.percentOfSupply;
    existing.tier = exposeTier(existing.exposeScore);
    byAddress.set(key, existing);
  }

  return [...byAddress.values()]
    .filter((f) => f.exposeScore >= 25)
    .sort((a, b) => b.exposeScore - a.exposeScore)
    .slice(0, 20);
}

export async function scanForExposedWallets(
  contractAddress: string,
  overview: TokenOverview,
  holders: HolderEntry[],
  options: { fullScan?: boolean } = {}
): Promise<ExposeScanResult> {
  const normalized = normalizeAddress(contractAddress);
  const basicExposed = scoreBasicHolders(holders, overview);

  let exposedWallets = basicExposed;
  let sharedSources: SharedFundSource[] = [];
  let insiderClusterScore = 0;
  let scanDepth: ExposeScanResult["scanDepth"] = "basic";

  if (options.fullScan) {
    const fundTrace = await traceTokenFunds(
      normalized,
      holders,
      overview.symbol,
      15
    );
    sharedSources = fundTrace.sharedSources;
    insiderClusterScore = fundTrace.insiderClusterScore;
    exposedWallets = mergeFundTraceScores(
      basicExposed,
      sharedSources,
      fundTrace.entries
    );
    scanDepth = "full";
  }

  const traders = await fetchTopTraders(
    normalized,
    holders,
    overview.decimals,
    overview.priceUsd
  ).catch(() => []);

  const critical = exposedWallets.filter((f) => f.tier === "CRITICAL").length;
  const high = exposedWallets.filter((f) => f.tier === "HIGH").length;
  const summary =
    exposedWallets.length === 0
      ? "No suspicious wallets flagged from holder distribution."
      : `${exposedWallets.length} wallet(s) exposed: ${critical} critical, ${high} high risk.` +
        (sharedSources.length > 0
          ? ` ${sharedSources.length} shared funding cluster(s) detected.`
          : "");

  return {
    contractAddress: normalized,
    tokenSymbol: overview.symbol,
    exposedWallets,
    traders,
    sharedSources,
    insiderClusterScore,
    scanDepth,
    summary,
    fetchedAt: new Date().toISOString(),
    cached: false,
  };
}

/** @deprecated */
export const scanForFishyWallets = scanForExposedWallets;
