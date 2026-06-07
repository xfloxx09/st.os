import type {
  WalletPnl,
  WalletProfile,
  WalletRating,
  WalletRatingFactor,
} from "@/lib/analyze/types";

type WalletTier = WalletRating["tier"];

function tierFromScore(score: number): WalletTier {
  if (score >= 80) return "ALPHA";
  if (score >= 65) return "SOLID";
  if (score >= 45) return "NEUTRAL";
  if (score >= 25) return "RISKY";
  return "TOXIC";
}

function summaryForTier(tier: WalletTier): string {
  switch (tier) {
    case "ALPHA":
      return "High-conviction wallet — clean funding, active edge, strong positioning.";
    case "SOLID":
      return "Reliable profile — few red flags, decent activity and holdings.";
    case "NEUTRAL":
      return "Mixed signals — worth watching but not a clear alpha or toxic wallet.";
    case "RISKY":
      return "Elevated risk — suspicious funding, weak PNL, or erratic behavior.";
    case "TOXIC":
      return "Avoid — mixer links, scam patterns, or heavily negative indicators.";
  }
}

export function computeWalletRating(
  profile: Pick<
    WalletProfile,
    "fundOrigin" | "trades" | "pnl" | "portfolio" | "behaviorLabel"
  >
): WalletRating {
  let score = 52;
  const factors: WalletRatingFactor[] = [];

  const flags = profile.fundOrigin.flags;
  if (flags.length > 0) {
    const impact = -28;
    score += impact;
    factors.push({
      label: "Mixer / taint",
      impact,
      detail: flags.join("; "),
    });
  }

  if (profile.fundOrigin.hops >= 4) {
    score -= 8;
    factors.push({
      label: "Deep fund chain",
      impact: -8,
      detail: `${profile.fundOrigin.hops} hops to origin`,
    });
  } else if (profile.fundOrigin.sourceAddress && profile.fundOrigin.hops <= 2) {
    score += 6;
    factors.push({
      label: "Traceable origin",
      impact: 6,
      detail: profile.fundOrigin.source,
    });
  }

  const buys = profile.trades.filter(
    (t) => t.type === "BUY" || t.type === "TRANSFER_IN"
  ).length;
  const sells = profile.trades.filter(
    (t) => t.type === "SELL" || t.type === "TRANSFER_OUT"
  ).length;

  if (buys > sells && buys >= 2) {
    score += 10;
    factors.push({
      label: "Net accumulator",
      impact: 10,
      detail: `${buys} in / ${sells} out`,
    });
  } else if (sells > buys * 2 && sells >= 3) {
    score -= 12;
    factors.push({
      label: "Heavy distributor",
      impact: -12,
      detail: `${sells} out vs ${buys} in`,
    });
  }

  score += pnlScore(profile.pnl, factors);
  score += portfolioScore(profile.portfolio.length, factors);
  score += behaviorScore(profile.behaviorLabel, factors);

  if (profile.trades.length >= 6) {
    score += 5;
    factors.push({
      label: "Active on-chain",
      impact: 5,
      detail: `${profile.trades.length} recorded transfers`,
    });
  }

  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const tier = tierFromScore(clamped);

  return {
    score: clamped,
    tier,
    summary: summaryForTier(tier),
    factors,
  };
}

function pnlScore(pnl: WalletPnl, factors: WalletRatingFactor[]): number {
  if (pnl.status === "EXITED" && pnl.position === 0) {
    factors.push({
      label: "Exited position",
      impact: 4,
      detail: "Took profit or rotated capital",
    });
    return 4;
  }
  if (pnl.unrealizedPnlPercent != null && pnl.unrealizedPnlPercent > 25) {
    factors.push({
      label: "Strong unrealized PNL",
      impact: 14,
      detail: `${pnl.unrealizedPnlPercent.toFixed(1)}%`,
    });
    return 14;
  }
  if (pnl.unrealizedPnlPercent != null && pnl.unrealizedPnlPercent < -35) {
    factors.push({
      label: "Deep drawdown",
      impact: -14,
      detail: `${pnl.unrealizedPnlPercent.toFixed(1)}%`,
    });
    return -14;
  }
  if (pnl.status === "AIRDROP") {
    factors.push({
      label: "Airdrop recipient",
      impact: -6,
      detail: "No organic entry detected",
    });
    return -6;
  }
  return 0;
}

function portfolioScore(count: number, factors: WalletRatingFactor[]): number {
  if (count >= 8) {
    factors.push({
      label: "Diversified portfolio",
      impact: 10,
      detail: `${count} token positions`,
    });
    return 10;
  }
  if (count === 0) {
    factors.push({
      label: "No portfolio data",
      impact: -4,
      detail: "Alchemy balances unavailable",
    });
    return -4;
  }
  return 0;
}

function behaviorScore(label: string, factors: WalletRatingFactor[]): number {
  const map: Record<string, number> = {
    WHALE: 8,
    "DIAMOND HANDS": 6,
    "SERIAL DEGEN": -10,
    "AIRDROP RECIPIENT": -8,
    "UNKNOWN PROFILE": 0,
  };
  const impact = map[label] ?? 0;
  if (impact !== 0) {
    factors.push({
      label: "Behavior tag",
      impact,
      detail: label,
    });
  }
  return impact;
}

export function extractConnectedWallets(
  profile: WalletProfile
): Array<{ address: string; label: string | null; relation: string }> {
  const seen = new Set<string>();
  const out: Array<{ address: string; label: string | null; relation: string }> =
    [];

  const add = (address: string, relation: string) => {
    const lower = address.toLowerCase();
    if (lower === profile.walletAddress.toLowerCase() || seen.has(lower)) return;
    seen.add(lower);
    out.push({ address: lower, label: null, relation });
  };

  if (profile.fundOrigin.sourceAddress) {
    add(profile.fundOrigin.sourceAddress, "Fund source");
  }

  for (const trade of profile.trades.slice(0, 30)) {
    // Counterparties are embedded in trade flow — use fund origin + portfolio peers
    void trade;
  }

  return out.slice(0, 12);
}
