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

export interface HoldersMeta {
  source: "etherscan" | "blockscout";
  totalRaw: number;
  analyzable: number;
  filtered: number;
  warning?: string;
  proRequired?: boolean;
}

export interface CaAnalysisResult {
  contractAddress: string;
  overview: TokenOverview;
  holders: HolderEntry[];
  allHolders: HolderEntry[];
  holdersMeta?: HoldersMeta;
  fetchedAt: string;
  cached: boolean;
}

export interface FundOrigin {
  source: string;
  sourceAddress: string | null;
  timestamp: string | null;
  hops: number;
  flags: string[];
}

export interface TokenTrade {
  type: "BUY" | "SELL" | "TRANSFER_IN" | "TRANSFER_OUT";
  timestamp: string;
  tokenAmount: number;
  ethAmount: number | null;
  priceUsd: number | null;
  txHash: string;
}

export interface PortfolioHolding {
  address: string;
  symbol: string;
  name: string;
  balance: number;
  usdValue: number | null;
}

export interface WalletPnl {
  averageEntryUsd: number | null;
  currentPriceUsd: number | null;
  position: number;
  unrealizedPnlUsd: number | null;
  unrealizedPnlPercent: number | null;
  realizedPnlUsd: number | null;
  status: "OPEN" | "EXITED" | "AIRDROP" | "UNKNOWN";
}

export interface WalletProfile {
  walletAddress: string;
  contractAddress: string;
  fundOrigin: FundOrigin;
  trades: TokenTrade[];
  portfolio: PortfolioHolding[];
  pnl: WalletPnl;
  behaviorLabel: string;
  behaviorConfidence: "LOW" | "MEDIUM" | "HIGH";
  fetchedAt: string;
  cached: boolean;
}

export interface WalletRatingFactor {
  label: string;
  impact: number;
  detail: string;
}

export interface WalletRating {
  score: number;
  tier: "ALPHA" | "SOLID" | "NEUTRAL" | "RISKY" | "TOXIC";
  summary: string;
  factors: WalletRatingFactor[];
}

export interface ConnectedWallet {
  address: string;
  label: string | null;
  relation: string;
}

export interface WalletTrackSnapshot extends WalletProfile {
  rating: WalletRating;
  connectedWallets: ConnectedWallet[];
  ethBalance: number | null;
  trackLabel: string | null;
  tracking: boolean;
}

export interface CrossHolderOverlap {
  address: string;
  label: string | null;
  tokens: Array<{ contractAddress: string; percentOfSupply: number }>;
  overlapScore: number;
}
