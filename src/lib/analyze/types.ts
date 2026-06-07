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
  capped?: boolean;
  maxFetched?: number;
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
  tokens: Array<{
    contractAddress: string;
    symbol: string | null;
    percentOfSupply: number;
  }>;
  overlapScore: number;
  insiderScore: number;
}

export interface SharedFundSource {
  sourceAddress: string;
  label: string | null;
  holderAddresses: string[];
  holderRanks: number[];
  suspicionScore: number;
  flags: string[];
}

export interface FundTraceEntry {
  holderAddress: string;
  holderRank: number;
  holderLabel: string | null;
  percentOfSupply: number;
  fundOrigin: FundOrigin;
}

export interface FundTraceResult {
  contractAddress: string;
  tokenSymbol: string | null;
  entries: FundTraceEntry[];
  sharedSources: SharedFundSource[];
  insiderClusterScore: number;
  fetchedAt: string;
  cached: boolean;
}

export interface CrossAnalysisResult {
  contracts: string[];
  tokenSymbols: Record<string, string | null>;
  overlaps: CrossHolderOverlap[];
  sharedFundSources: SharedFundSource[];
  totalOverlappingWallets: number;
  topInsiderCandidates: CrossHolderOverlap[];
  fetchedAt: string;
  cached: boolean;
}

export type NetworkClusterVerdict =
  | "WINNING_SYNDICATE"
  | "LOSING_BAGHOLDERS"
  | "MIXED"
  | "UNKNOWN";

export type PnlAlignment =
  | "WINNING_TOGETHER"
  | "LOSING_TOGETHER"
  | "MIXED"
  | "UNKNOWN";

export interface NetworkFriend {
  address: string;
  label: string | null;
  relationTypes: string[];
  commonTokens: Array<{
    contractAddress: string;
    symbol: string;
    seedBoughtAt: string;
    friendBoughtAt: string;
    daysApart: number;
  }>;
  bondScore: number;
  estimatedPnlUsd: number | null;
  pnlAlignment: PnlAlignment;
}

export interface CommonTokenCluster {
  contractAddress: string;
  symbol: string;
  friendCount: number;
  seedPositionUsd: number | null;
  avgFriendPositionUsd: number | null;
  pnlAlignment: PnlAlignment;
  linkedWallets: string[];
}

export interface NetworkGraphNode {
  id: string;
  type: "wallet" | "token" | "funding";
  label: string;
  address?: string;
  isSeed?: boolean;
  bondScore?: number;
  pnlAlignment?: PnlAlignment;
  tier: string;
}

export interface NetworkGraphEdge {
  id: string;
  from: string;
  to: string;
  type: "CO_BOUGHT" | "FUNDED_BY" | "TRANSFERRED" | "SHARED_TOKEN";
  label: string;
  strength: number;
  tokenSymbol?: string;
  timestamp?: string;
}

export interface WalletNetworkResult {
  seedWallet: string;
  contextContract: string | null;
  windowDays: number;
  friends: NetworkFriend[];
  commonTokenClusters: CommonTokenCluster[];
  graph: {
    nodes: NetworkGraphNode[];
    edges: NetworkGraphEdge[];
  };
  clusterVerdict: NetworkClusterVerdict;
  suspicionScore: number;
  summary: string;
  fetchedAt: string;
  cached: boolean;
}

export interface TraderEntry {
  rank: number;
  address: string;
  label: string | null;
  position: number;
  realizedPnlUsd: number | null;
  unrealizedPnlUsd: number | null;
  totalPnlUsd: number | null;
  pnlPercent: number | null;
  tradeCount: number;
  status: "OPEN" | "EXITED" | "AIRDROP" | "UNKNOWN";
}

export interface ExposedWallet {
  address: string;
  label: string | null;
  holderRank: number | null;
  percentOfSupply: number | null;
  exposeScore: number;
  tier: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  reasons: string[];
  flags: string[];
  sharedFundWith: string[];
}

/** @deprecated use ExposedWallet */
export type FishyWallet = ExposedWallet;

export interface ExposeScanResult {
  contractAddress: string;
  tokenSymbol: string | null;
  exposedWallets: ExposedWallet[];
  traders: TraderEntry[];
  sharedSources: SharedFundSource[];
  insiderClusterScore: number;
  scanDepth: "basic" | "full";
  summary: string;
  fetchedAt: string;
  cached: boolean;
}

export interface BulkExposeEntry {
  walletAddress: string;
  label: string | null;
  exposeScore: number;
  network: WalletNetworkResult | null;
  error?: string;
}

export interface BulkExposeResult {
  contractAddress: string;
  windowDays: number;
  entries: BulkExposeEntry[];
  primaryNetwork: WalletNetworkResult | null;
  combinedSuspicion: number;
  summary: string;
  fetchedAt: string;
  cached: boolean;
}

export type WalletStrategy =
  | "ALPHA LEADER"
  | "ALPHA"
  | "EARLY BUYER"
  | "FOLLOWS ALPHA"
  | "SNIPER"
  | "SWING TRADER"
  | "DIAMOND HANDS"
  | "WHALE STACKER"
  | "SERIAL DEGEN"
  | "AIRDROP"
  | "UNKNOWN";

export interface WindowPnlSnapshot {
  realizedPnlUsd: number | null;
  unrealizedPnlUsd: number | null;
  totalPnlUsd: number | null;
  position: number;
  positionUsd: number | null;
  tradeCount: number;
  status: TraderEntry["status"];
}

export interface TradeMarker {
  timestamp: string;
  type: "BUY" | "SELL";
  tokenAmount: number;
  txHash: string;
}

export interface TokenChartPoint {
  timestamp: string;
  priceUsd: number;
}

export interface ProTrackWallet {
  rank: number;
  address: string;
  label: string | null;
  holderRank: number | null;
  percentOfSupply: number | null;
  strategy: WalletStrategy;
  strategyDetail: string;
  preferredWindow: string;
  intelScore: number;
  trackScore: number;
  firstMoverScore: number;
  followers30m: number;
  minsAfterFirstBuyer: number | null;
  minsBehindLeader: number | null;
  buyRank: number | null;
  pnlCurrent: WindowPnlSnapshot;
  pnlDay: WindowPnlSnapshot;
  pnlWeek: WindowPnlSnapshot;
  pnlMonth: WindowPnlSnapshot;
  markers: TradeMarker[];
  trackReasons: string[];
}

export interface ProAlphaScanResult {
  contractAddress: string;
  tokenSymbol: string | null;
  trackWallets: ProTrackWallet[];
  chartPoints: TokenChartPoint[];
  summary: string;
  fetchedAt: string;
  cached: boolean;
}
