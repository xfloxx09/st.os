import {
  fetchTokenMetadata,
  fetchWalletTokenBalances,
} from "@/lib/alchemy";
import { fetchDexTokenData } from "@/lib/dexscreener";
import {
  fetchEthTransactions,
  fetchTokenTransactions,
} from "@/lib/etherscan-wallet";
import {
  getAddressCategory,
  getAddressLabel,
} from "@/lib/labels";
import { normalizeAddress } from "@/lib/ethereum";
import type {
  FundOrigin,
  PortfolioHolding,
  TokenTrade,
  WalletPnl,
  WalletProfile,
} from "@/lib/analyze/types";

const MIN_ETH_INFLOW = 0.05;
const MAX_FUND_HOPS = 5;

function weiToEth(wei: string): number {
  return Number(wei) / 1e18;
}

function tokenAmount(raw: string, decimals: number): number {
  return Number(raw) / 10 ** decimals;
}

async function traceFundOrigin(walletAddress: string): Promise<FundOrigin> {
  const txs = await fetchEthTransactions(walletAddress, 1, 25).catch(() => []);
  const inflows = txs
    .filter((tx) => normalizeAddress(tx.to) === walletAddress && tx.isError === "0")
    .map((tx) => ({
      from: normalizeAddress(tx.from),
      value: weiToEth(tx.value),
      timestamp: new Date(Number(tx.timeStamp) * 1000).toISOString(),
    }))
    .filter((tx) => tx.value >= MIN_ETH_INFLOW);

  const flags: string[] = [];
  let hops = 0;
  let current = walletAddress;
  let source = "ORIGIN UNKNOWN";
  let sourceAddress: string | null = null;
  let timestamp: string | null = null;

  for (let hop = 0; hop < MAX_FUND_HOPS; hop++) {
    const hopTxs = hop === 0 ? inflows : [];
    if (hop > 0) {
      const upstream = await fetchEthTransactions(current, 1, 15).catch(() => []);
      const firstIn = upstream
        .filter((tx) => normalizeAddress(tx.to) === current && tx.isError === "0")
        .map((tx) => ({
          from: normalizeAddress(tx.from),
          value: weiToEth(tx.value),
          timestamp: new Date(Number(tx.timeStamp) * 1000).toISOString(),
        }))
        .find((tx) => tx.value >= MIN_ETH_INFLOW);
      if (!firstIn) break;
      hopTxs.push(firstIn);
    }

    const inflow = hop === 0 ? inflows[0] : hopTxs[0];
    if (!inflow) break;

    hops = hop + 1;
    sourceAddress = inflow.from;
    timestamp = inflow.timestamp;
    current = inflow.from;

    const label = getAddressLabel(inflow.from);
    const category = getAddressCategory(inflow.from);

    if (category === "mixers") {
      flags.push("Tornado Cash / mixer interaction detected");
      source = "Mixer";
      break;
    }
    if (label) {
      source = label;
      break;
    }
    if (hop === MAX_FUND_HOPS - 1) {
      source = "ORIGIN UNKNOWN (>5 hops deep)";
    } else {
      source = `Wallet ${inflow.from.slice(0, 10)}...`;
    }
  }

  const allEthTxs = await fetchEthTransactions(walletAddress, 1, 100).catch(() => []);
  for (const tx of allEthTxs) {
    const from = normalizeAddress(tx.from);
    if (getAddressCategory(from) === "mixers") {
      flags.push("Historical mixer interaction detected");
      break;
    }
  }

  const firstActivity = txs[0]
    ? new Date(Number(txs[0].timeStamp) * 1000).toISOString()
    : null;

  return {
    source,
    sourceAddress,
    timestamp: timestamp ?? firstActivity,
    hops,
    flags,
  };
}

function classifyTrades(
  tokenTxs: Awaited<ReturnType<typeof fetchTokenTransactions>>,
  walletAddress: string,
  decimals: number,
  priceUsd: number | null
): TokenTrade[] {
  return tokenTxs.map((tx) => {
    const amount = tokenAmount(tx.value, decimals);
    const isIncoming = normalizeAddress(tx.to) === walletAddress;
    const type: TokenTrade["type"] = isIncoming ? "TRANSFER_IN" : "TRANSFER_OUT";

    return {
      type,
      timestamp: new Date(Number(tx.timeStamp) * 1000).toISOString(),
      tokenAmount: amount,
      ethAmount: null,
      priceUsd,
      txHash: tx.hash,
    };
  });
}

function calculatePnl(
  trades: TokenTrade[],
  currentPriceUsd: number | null
): WalletPnl {
  let bought = 0;
  let sold = 0;
  let received = 0;
  let sent = 0;

  for (const trade of trades) {
    if (trade.type === "TRANSFER_IN" || trade.type === "BUY") {
      received += trade.tokenAmount;
      bought += trade.tokenAmount;
    } else {
      sent += trade.tokenAmount;
      sold += trade.tokenAmount;
    }
  }

  const position = received - sent;
  if (position <= 0 && sold > 0) {
    return {
      averageEntryUsd: null,
      currentPriceUsd,
      position: 0,
      unrealizedPnlUsd: null,
      unrealizedPnlPercent: null,
      realizedPnlUsd: null,
      status: "EXITED",
    };
  }

  if (bought === 0 && received > 0) {
    return {
      averageEntryUsd: 0,
      currentPriceUsd,
      position,
      unrealizedPnlUsd:
        currentPriceUsd != null ? currentPriceUsd * position : null,
      unrealizedPnlPercent: null,
      realizedPnlUsd: null,
      status: "AIRDROP",
    };
  }

  const avgEntry = currentPriceUsd;
  const unrealized =
    avgEntry != null && currentPriceUsd != null
      ? (currentPriceUsd - avgEntry) * position
      : null;

  return {
    averageEntryUsd: avgEntry,
    currentPriceUsd,
    position,
    unrealizedPnlUsd: unrealized,
    unrealizedPnlPercent:
      avgEntry && currentPriceUsd
        ? ((currentPriceUsd / avgEntry) - 1) * 100
        : null,
    realizedPnlUsd: null,
    status: position > 0 ? "OPEN" : "UNKNOWN",
  };
}

function deriveBehaviorLabel(
  trades: TokenTrade[],
  pnl: WalletPnl,
  percentOfSupply: number | null
): { label: string; confidence: "LOW" | "MEDIUM" | "HIGH" } {
  if (pnl.status === "AIRDROP") {
    return { label: "AIRDROP RECIPIENT", confidence: "HIGH" };
  }
  if (percentOfSupply != null && percentOfSupply > 2) {
    return { label: "WHALE", confidence: "MEDIUM" };
  }
  if (trades.length >= 8) {
    return { label: "SERIAL DEGEN", confidence: "MEDIUM" };
  }
  if (trades.length <= 2 && pnl.status === "OPEN") {
    return { label: "DIAMOND HANDS", confidence: "LOW" };
  }
  return { label: "UNKNOWN PROFILE", confidence: "LOW" };
}

async function buildPortfolio(walletAddress: string): Promise<PortfolioHolding[]> {
  const balances = await fetchWalletTokenBalances(walletAddress);
  const top = balances.slice(0, 20);
  const holdings: PortfolioHolding[] = [];

  for (const item of top) {
    const address = normalizeAddress(item.contractAddress);
    const meta = await fetchTokenMetadata(address);
    const decimals = meta?.decimals ?? 18;
    const balance = Number(BigInt(item.tokenBalance)) / 10 ** decimals;
    if (balance <= 0) continue;

    const dex = await fetchDexTokenData(address).catch(() => null);
    const priceUsd = dex?.priceUsd ? Number(dex.priceUsd) : null;

    holdings.push({
      address,
      symbol: meta?.symbol ?? "???",
      name: meta?.name ?? "Unknown",
      balance,
      usdValue: priceUsd != null ? balance * priceUsd : null,
    });
  }

  return holdings.sort((a, b) => (b.usdValue ?? 0) - (a.usdValue ?? 0));
}

export async function analyzeWalletOverview(
  walletAddress: string
): Promise<WalletProfile> {
  const wallet = normalizeAddress(walletAddress);
  const fundOrigin = await traceFundOrigin(wallet);
  const portfolio = await buildPortfolio(wallet);

  return {
    walletAddress: wallet,
    contractAddress: wallet,
    fundOrigin,
    trades: [],
    portfolio,
    pnl: {
      averageEntryUsd: null,
      currentPriceUsd: null,
      position: 0,
      unrealizedPnlUsd: null,
      unrealizedPnlPercent: null,
      realizedPnlUsd: null,
      status: "UNKNOWN",
    },
    behaviorLabel: portfolio.length >= 5 ? "ACTIVE HOLDER" : "UNKNOWN PROFILE",
    behaviorConfidence: "LOW",
    fetchedAt: new Date().toISOString(),
    cached: false,
  };
}

export async function analyzeWallet(
  walletAddress: string,
  contractAddress: string,
  percentOfSupply: number | null = null
): Promise<WalletProfile> {
  const wallet = normalizeAddress(walletAddress);
  const contract = normalizeAddress(contractAddress);

  const [fundOrigin, tokenTxs, dex] = await Promise.all([
    traceFundOrigin(wallet),
    fetchTokenTransactions(wallet, contract, 1, 100).catch(() => []),
    fetchDexTokenData(contract).catch(() => null),
  ]);

  const decimals = Number(tokenTxs[0]?.tokenDecimal ?? "18");
  const priceUsd = dex?.priceUsd ? Number(dex.priceUsd) : null;
  const trades = classifyTrades(tokenTxs, wallet, decimals, priceUsd);
  const pnl = calculatePnl(trades, priceUsd);
  const portfolio = await buildPortfolio(wallet);
  const behavior = deriveBehaviorLabel(trades, pnl, percentOfSupply);

  return {
    walletAddress: wallet,
    contractAddress: contract,
    fundOrigin,
    trades,
    portfolio,
    pnl,
    behaviorLabel: behavior.label,
    behaviorConfidence: behavior.confidence,
    fetchedAt: new Date().toISOString(),
    cached: false,
  };
}
