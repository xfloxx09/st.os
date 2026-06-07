export interface RiskFlag {
  level: "danger" | "warning" | "info";
  code: string;
  message: string;
}

export interface TokenOverview {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  deployer: string | null;
  deploymentTx: string | null;
  verified: boolean;
  priceUsd: number | null;
  priceChange24h: number | null;
  marketCap: number | null;
  liquidityUsd: number | null;
  volume24h: number | null;
  topPoolAddress: string | null;
  topPoolDex: string | null;
  riskFlags: RiskFlag[];
}

export interface HolderEntry {
  rank: number;
  address: string;
  label: string | null;
  balance: string;
  percentOfSupply: number;
  usdValue: number | null;
  excluded: boolean;
}

export interface CaAnalysisResult {
  contractAddress: string;
  overview: TokenOverview;
  holders: HolderEntry[];
  allHolders: HolderEntry[];
  fetchedAt: string;
  cached: boolean;
}
