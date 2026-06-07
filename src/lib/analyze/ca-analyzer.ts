import {
  fetchContractCreation,
  fetchContractSource,
  fetchTokenHolders,
  fetchTokenInfo,
} from "@/lib/etherscan";
import { fetchDexTokenData } from "@/lib/dexscreener";
import { checkHoneypot } from "@/lib/honeypot";
import {
  getAddressLabel,
  shouldExcludeHolder,
} from "@/lib/labels";
import { normalizeAddress } from "@/lib/ethereum";
import type { CaAnalysisResult, HolderEntry, RiskFlag, TokenOverview } from "@/lib/analyze/types";

function parseSupply(raw: string, decimals: number): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value / 10 ** decimals;
}

function buildRiskFlags(
  verified: boolean,
  honeypot: Awaited<ReturnType<typeof checkHoneypot>>
): RiskFlag[] {
  const flags: RiskFlag[] = [];

  if (!verified) {
    flags.push({
      level: "warning",
      code: "UNVERIFIED",
      message: "Contract source not verified on Etherscan",
    });
  }

  if (honeypot?.isHoneypot) {
    flags.push({
      level: "danger",
      code: "HONEYPOT",
      message: honeypot.honeypotReason ?? "Honeypot detected",
    });
  }

  if (honeypot && (honeypot.buyTax ?? 0) > 10) {
    flags.push({
      level: "warning",
      code: "HIGH_BUY_TAX",
      message: `Buy tax: ${honeypot.buyTax}%`,
    });
  }

  if (honeypot && (honeypot.sellTax ?? 0) > 10) {
    flags.push({
      level: "warning",
      code: "HIGH_SELL_TAX",
      message: `Sell tax: ${honeypot.sellTax}%`,
    });
  }

  return flags;
}

export async function analyzeContractAddress(
  contractAddress: string
): Promise<CaAnalysisResult> {
  const address = normalizeAddress(contractAddress);

  const [tokenInfo, dex, creation, source, honeypot, rawHolders] =
    await Promise.all([
      fetchTokenInfo(address).catch(() => null),
      fetchDexTokenData(address).catch(() => null),
      fetchContractCreation(address).catch(() => null),
      fetchContractSource(address).catch(() => null),
      checkHoneypot(address),
      fetchTokenHolders(address, 1, 100).catch(() => []),
    ]);

  const decimals = Number(tokenInfo?.divisor ?? "18");
  const totalSupplyRaw = tokenInfo?.totalSupply ?? "0";
  const totalSupplyNum = parseSupply(totalSupplyRaw, decimals);
  const priceUsd = dex?.priceUsd ? Number(dex.priceUsd) : null;
  const verified =
    Boolean(source?.SourceCode) && source?.SourceCode !== "";

  const overview: TokenOverview = {
    address,
    name: tokenInfo?.tokenName ?? dex?.baseToken.name ?? "Unknown Token",
    symbol: tokenInfo?.symbol ?? dex?.baseToken.symbol ?? "???",
    decimals,
    totalSupply: totalSupplyNum.toString(),
    deployer: creation?.contractCreator ?? null,
    deploymentTx: creation?.txHash ?? null,
    verified,
    priceUsd,
    priceChange24h: dex?.priceChange?.h24 ?? null,
    marketCap: dex?.marketCap ?? null,
    liquidityUsd: dex?.liquidity?.usd ?? null,
    volume24h: dex?.volume?.h24 ?? null,
    topPoolAddress: dex?.pairAddress ?? null,
    topPoolDex: dex?.dexId ?? null,
    riskFlags: buildRiskFlags(verified, honeypot),
  };

  const allHolders: HolderEntry[] = rawHolders.map((holder, index) => {
    const holderAddress = normalizeAddress(holder.TokenHolderAddress);
    const balanceRaw = Number(holder.TokenHolderQuantity);
    const balance = balanceRaw / 10 ** decimals;
    const percentOfSupply =
      totalSupplyNum > 0 ? (balance / totalSupplyNum) * 100 : 0;
    const label = getAddressLabel(holderAddress);
    const excluded = shouldExcludeHolder(holderAddress, address);

    return {
      rank: index + 1,
      address: holderAddress,
      label,
      balance: balance.toString(),
      percentOfSupply,
      usdValue: priceUsd != null ? balance * priceUsd : null,
      excluded,
    };
  });

  const holders = allHolders.filter((h) => !h.excluded);

  return {
    contractAddress: address,
    overview,
    holders,
    allHolders,
    fetchedAt: new Date().toISOString(),
    cached: false,
  };
}
