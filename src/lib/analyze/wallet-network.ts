import { traceFundOrigin } from "@/lib/analyze/wallet-analyzer";
import type {
  NetworkClusterVerdict,
  NetworkFriend,
  PnlAlignment,
  WalletNetworkResult,
} from "@/lib/analyze/types";
import { fetchDexTokenData } from "@/lib/dexscreener";
import {
  fetchAllTokenTransactions,
  type TokenTx,
} from "@/lib/etherscan-wallet";
import { normalizeAddress } from "@/lib/ethereum";
import {
  getAddressCategory,
  getAddressLabel,
  shouldExcludeHolder,
} from "@/lib/labels";

export type NetworkWindow = 30 | 90;

const MAX_FRIENDS = 18;
const MAX_TOKEN_EXPANSION = 8;
const FRIEND_TX_LIMIT = 120;

interface TokenActivity {
  contract: string;
  symbol: string;
  firstBuyTs: number;
  lastActivityTs: number;
  netIn: number;
  buyCount: number;
}

interface FriendCandidate {
  address: string;
  interactions: number;
  sharedTokens: Map<
    string,
    { symbol: string; seedTs: number; friendTs: number; daysApart: number }
  >;
  relationTypes: Set<string>;
}

function windowStartMs(days: NetworkWindow): number {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

function isExcludedAddress(address: string): boolean {
  const category = getAddressCategory(address);
  return (
    shouldExcludeHolder(address, "0x0000000000000000000000000000000000000000") ||
    category === "cex" ||
    category === "dex" ||
    category === "bridges" ||
    category === "burn"
  );
}

function tokenAmount(raw: string, decimals: string): number {
  const d = Number(decimals) || 18;
  return Number(BigInt(raw)) / 10 ** d;
}

function parseActivities(
  txs: TokenTx[],
  wallet: string,
  sinceMs: number
): {
  tokens: Map<string, TokenActivity>;
  counterparties: Map<string, number>;
} {
  const tokens = new Map<string, TokenActivity>();
  const counterparties = new Map<string, number>();
  const w = wallet.toLowerCase();

  for (const tx of txs) {
    const ts = Number(tx.timeStamp) * 1000;
    if (ts < sinceMs) continue;

    const contract = normalizeAddress(tx.contractAddress);
    const from = normalizeAddress(tx.from);
    const to = normalizeAddress(tx.to);
    const amount = tokenAmount(tx.value, tx.tokenDecimal);
    const symbol = tx.tokenSymbol || "???";

    const existing = tokens.get(contract) ?? {
      contract,
      symbol,
      firstBuyTs: ts,
      lastActivityTs: ts,
      netIn: 0,
      buyCount: 0,
    };

    if (to === w) {
      existing.netIn += amount;
      existing.buyCount += 1;
      if (ts < existing.firstBuyTs) existing.firstBuyTs = ts;
      if (!isExcludedAddress(from)) {
        counterparties.set(from, (counterparties.get(from) ?? 0) + 1);
      }
    } else if (from === w) {
      existing.netIn -= amount;
      if (!isExcludedAddress(to)) {
        counterparties.set(to, (counterparties.get(to) ?? 0) + 1);
      }
    }

    existing.lastActivityTs = Math.max(existing.lastActivityTs, ts);
    tokens.set(contract, existing);
  }

  return { tokens, counterparties };
}

function mergeSharedToken(
  friend: FriendCandidate,
  contract: string,
  symbol: string,
  seedTs: number,
  friendTs: number
) {
  const daysApart = Math.abs(seedTs - friendTs) / (24 * 60 * 60 * 1000);
  const prev = friend.sharedTokens.get(contract);
  if (!prev || daysApart < prev.daysApart) {
    friend.sharedTokens.set(contract, {
      symbol,
      seedTs,
      friendTs,
      daysApart: Math.round(daysApart * 10) / 10,
    });
  }
  if (daysApart <= 1) friend.relationTypes.add("SAME_DAY_BUY");
  else if (daysApart <= 7) friend.relationTypes.add("SAME_WEEK_BUY");
  friend.relationTypes.add("CO_BOUGHT");
}

async function estimateTokenPnlUsd(
  contract: string,
  netIn: number
): Promise<number | null> {
  if (netIn <= 0) return 0;
  const dex = await fetchDexTokenData(contract).catch(() => null);
  const price = dex?.priceUsd ? Number(dex.priceUsd) : null;
  if (price == null) return null;
  return netIn * price;
}

function pnlAlignment(
  seedPnl: number | null,
  friendPnl: number | null
): "WINNING_TOGETHER" | "LOSING_TOGETHER" | "MIXED" | "UNKNOWN" {
  if (seedPnl == null || friendPnl == null) return "UNKNOWN";
  if (seedPnl > 100 && friendPnl > 100) return "WINNING_TOGETHER";
  if (seedPnl < -100 && friendPnl < -100) return "LOSING_TOGETHER";
  if (seedPnl > 0 && friendPnl > 0) return "WINNING_TOGETHER";
  if (seedPnl <= 0 && friendPnl <= 0) return "LOSING_TOGETHER";
  return "MIXED";
}

function clusterVerdict(
  friends: WalletNetworkResult["friends"]
): NetworkClusterVerdict {
  let winning = 0;
  let losing = 0;
  for (const f of friends) {
    if (f.pnlAlignment === "WINNING_TOGETHER") winning += 1;
    if (f.pnlAlignment === "LOSING_TOGETHER") losing += 1;
  }
  if (winning >= 3 && winning > losing * 2) return "WINNING_SYNDICATE";
  if (losing >= 3 && losing > winning * 2) return "LOSING_BAGHOLDERS";
  if (friends.length >= 2) return "MIXED";
  return "UNKNOWN";
}

export async function buildWalletNetwork(
  seedWallet: string,
  windowDays: NetworkWindow = 90,
  contextContract?: string | null
): Promise<WalletNetworkResult> {
  const seed = normalizeAddress(seedWallet);
  const sinceMs = windowStartMs(windowDays);

  const seedTxs = await fetchAllTokenTransactions(seed, 1, 250).catch(() => []);
  const { tokens: seedTokens, counterparties } = parseActivities(
    seedTxs,
    seed,
    sinceMs
  );

  const friendMap = new Map<string, FriendCandidate>();

  for (const [address, count] of counterparties) {
    if (address === seed) continue;
    friendMap.set(address, {
      address,
      interactions: count,
      sharedTokens: new Map(),
      relationTypes: new Set(["COUNTERPARTY"]),
    });
  }

  const seedFund = await traceFundOrigin(seed).catch(() => null);

  const topCounterparties = [...friendMap.values()]
    .sort((a, b) => b.interactions - a.interactions)
    .slice(0, MAX_FRIENDS);

  await Promise.all(
    topCounterparties.map(async (friend) => {
      const txs = await fetchAllTokenTransactions(
        friend.address,
        1,
        FRIEND_TX_LIMIT
      ).catch(() => []);
      const { tokens: friendTokens } = parseActivities(txs, friend.address, sinceMs);

      for (const [contract, seedAct] of seedTokens) {
        const friendAct = friendTokens.get(contract);
        if (!friendAct || friendAct.buyCount === 0) continue;
        mergeSharedToken(
          friend,
          contract,
          seedAct.symbol,
          seedAct.firstBuyTs,
          friendAct.firstBuyTs
        );
      }

      if (seedFund?.sourceAddress) {
        const friendFund = await traceFundOrigin(friend.address).catch(() => null);
        if (
          friendFund?.sourceAddress &&
          normalizeAddress(friendFund.sourceAddress) ===
            normalizeAddress(seedFund.sourceAddress)
        ) {
          friend.relationTypes.add("SHARED_FUND_SOURCE");
        }
      }
    })
  );

  let friends = [...friendMap.values()]
    .filter((f) => f.sharedTokens.size > 0 || f.relationTypes.has("SHARED_FUND_SOURCE"))
    .map((f) => {
      const bondScore = Math.min(
        100,
        f.sharedTokens.size * 14 +
          f.interactions * 4 +
          (f.relationTypes.has("SHARED_FUND_SOURCE") ? 22 : 0) +
          (f.relationTypes.has("SAME_DAY_BUY") ? 18 : 0)
      );
      return {
        address: f.address,
        label: getAddressLabel(f.address),
        relationTypes: [...f.relationTypes],
        commonTokens: [...f.sharedTokens.entries()].map(([contract, meta]) => ({
          contractAddress: contract,
          symbol: meta.symbol,
          seedBoughtAt: new Date(meta.seedTs).toISOString(),
          friendBoughtAt: new Date(meta.friendTs).toISOString(),
          daysApart: meta.daysApart,
        })),
        bondScore,
        estimatedPnlUsd: null as number | null,
        pnlAlignment: "UNKNOWN" as PnlAlignment,
      } satisfies NetworkFriend;
    })
    .sort((a, b) => b.bondScore - a.bondScore)
    .slice(0, MAX_FRIENDS);

  const tokenFriendCount = new Map<string, number>();
  for (const f of friends) {
    for (const t of f.commonTokens) {
      tokenFriendCount.set(
        t.contractAddress,
        (tokenFriendCount.get(t.contractAddress) ?? 0) + 1
      );
    }
  }

  const expansionTokens = [...tokenFriendCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_TOKEN_EXPANSION)
    .map(([contract]) => contract);

  const commonTokenClusters = await Promise.all(
    expansionTokens.map(async (contract) => {
      const seedAct = seedTokens.get(contract);
      const symbol = seedAct?.symbol ?? "???";
      const linkedFriends = friends.filter((f) =>
        f.commonTokens.some((t) => t.contractAddress === contract)
      );
      const seedPnl = seedAct
        ? await estimateTokenPnlUsd(contract, seedAct.netIn)
        : null;

      const friendPnls = await Promise.all(
        linkedFriends.slice(0, 6).map(async (f) => {
          const txs = await fetchAllTokenTransactions(f.address, 1, 80).catch(
            () => []
          );
          const { tokens } = parseActivities(txs, f.address, sinceMs);
          const act = tokens.get(contract);
          const pnl = act
            ? await estimateTokenPnlUsd(contract, act.netIn)
            : null;
          return { address: f.address, pnl };
        })
      );

      const avgFriendPnl =
        friendPnls.filter((p) => p.pnl != null).length > 0
          ? friendPnls.reduce((s, p) => s + (p.pnl ?? 0), 0) /
            friendPnls.filter((p) => p.pnl != null).length
          : null;

      let alignment: "WINNING_TOGETHER" | "LOSING_TOGETHER" | "MIXED" | "UNKNOWN" =
        "UNKNOWN";
      if (seedPnl != null && avgFriendPnl != null) {
        alignment = pnlAlignment(seedPnl, avgFriendPnl);
      }

      return {
        contractAddress: contract,
        symbol,
        friendCount: linkedFriends.length,
        seedPositionUsd: seedPnl,
        avgFriendPositionUsd: avgFriendPnl,
        pnlAlignment: alignment,
        linkedWallets: linkedFriends.map((f) => f.address),
      };
    })
  );

  for (const friend of friends) {
    const pnls: number[] = [];
    const alignments: PnlAlignment[] = [];
    for (const cluster of commonTokenClusters) {
      if (!friend.commonTokens.some((t) => t.contractAddress === cluster.contractAddress))
        continue;
      if (cluster.seedPositionUsd != null) pnls.push(cluster.seedPositionUsd);
      alignments.push(cluster.pnlAlignment);
    }
    friend.estimatedPnlUsd =
      pnls.length > 0 ? pnls.reduce((a, b) => a + b, 0) / pnls.length : null;
    if (alignments.includes("WINNING_TOGETHER")) friend.pnlAlignment = "WINNING_TOGETHER";
    else if (alignments.includes("LOSING_TOGETHER")) friend.pnlAlignment = "LOSING_TOGETHER";
    else if (alignments.length > 0) friend.pnlAlignment = "MIXED";
  }

  const nodes: WalletNetworkResult["graph"]["nodes"] = [];
  const edges: WalletNetworkResult["graph"]["edges"] = [];

  const seedId = `wallet:${seed}`;
  nodes.push({
    id: seedId,
    type: "wallet",
    label: getAddressLabel(seed) ?? `TARGET`,
    address: seed,
    isSeed: true,
    tier: "TARGET",
  });

  if (seedFund?.sourceAddress && !isExcludedAddress(seedFund.sourceAddress)) {
    const fundId = `funding:${normalizeAddress(seedFund.sourceAddress)}`;
    nodes.push({
      id: fundId,
      type: "funding",
      label: seedFund.source,
      address: seedFund.sourceAddress,
      tier: "FUNDING",
    });
    edges.push({
      id: `e-fund-${seed}`,
      from: fundId,
      to: seedId,
      type: "FUNDED_BY",
      label: "funded",
      strength: 8,
    });
  }

  for (const friend of friends) {
    const friendId = `wallet:${friend.address}`;
    nodes.push({
      id: friendId,
      type: "wallet",
      label: friend.label ?? friend.address.slice(0, 8),
      address: friend.address,
      bondScore: friend.bondScore,
      pnlAlignment: friend.pnlAlignment,
      tier:
        friend.bondScore >= 70
          ? "INNER_CIRCLE"
          : friend.bondScore >= 45
            ? "ASSOCIATE"
            : "PERIPHERAL",
    });

    edges.push({
      id: `e-social-${friend.address}`,
      from: seedId,
      to: friendId,
      type: "CO_BOUGHT",
      label: `${friend.commonTokens.length} tokens`,
      strength: Math.min(10, Math.ceil(friend.bondScore / 10)),
    });

    if (friend.relationTypes.includes("SHARED_FUND_SOURCE") && seedFund?.sourceAddress) {
      const fundId = `funding:${normalizeAddress(seedFund.sourceAddress)}`;
      edges.push({
        id: `e-fund-${friend.address}`,
        from: fundId,
        to: friendId,
        type: "FUNDED_BY",
        label: "same source",
        strength: 9,
      });
    }

    for (const token of friend.commonTokens.slice(0, 4)) {
      const tokenId = `token:${token.contractAddress}`;
      if (!nodes.some((n) => n.id === tokenId)) {
        nodes.push({
          id: tokenId,
          type: "token",
          label: token.symbol,
          address: token.contractAddress,
          tier: "TOKEN",
        });
      }
      edges.push({
        id: `e-${friend.address}-${token.contractAddress}`,
        from: friendId,
        to: tokenId,
        type: "SHARED_TOKEN",
        label: `Δ${token.daysApart}d`,
        strength: token.daysApart <= 1 ? 9 : token.daysApart <= 7 ? 6 : 3,
        tokenSymbol: token.symbol,
        timestamp: token.friendBoughtAt,
      });
      edges.push({
        id: `e-seed-${token.contractAddress}`,
        from: seedId,
        to: tokenId,
        type: "SHARED_TOKEN",
        label: "bought",
        strength: 5,
        tokenSymbol: token.symbol,
        timestamp: token.seedBoughtAt,
      });
    }
  }

  const verdict = clusterVerdict(friends);
  const suspicionScore = Math.min(
    100,
    friends.filter((f) => f.relationTypes.includes("SHARED_FUND_SOURCE")).length *
      15 +
      friends.filter((f) => f.relationTypes.includes("SAME_DAY_BUY")).length * 12 +
      friends.filter((f) => f.bondScore >= 60).length * 8
  );

  return {
    seedWallet: seed,
    contextContract: contextContract ? normalizeAddress(contextContract) : null,
    windowDays,
    friends,
    commonTokenClusters,
    graph: { nodes, edges },
    clusterVerdict: verdict,
    suspicionScore,
    summary: buildSummary(seed, friends, verdict, windowDays),
    fetchedAt: new Date().toISOString(),
    cached: false,
  };
}

function buildSummary(
  seed: string,
  friends: WalletNetworkResult["friends"],
  verdict: NetworkClusterVerdict,
  windowDays: number
): string {
  if (friends.length === 0) {
    return `No co-buy network detected for ${seed.slice(0, 10)} in the last ${windowDays} days.`;
  }
  const inner = friends.filter((f) => f.bondScore >= 60).length;
  const sameDay = friends.filter((f) =>
    f.relationTypes.includes("SAME_DAY_BUY")
  ).length;
  return `${friends.length} linked wallets (${inner} inner circle) · ${sameDay} same-day co-buys · cluster: ${verdict.replace(/_/g, " ")}`;
}
