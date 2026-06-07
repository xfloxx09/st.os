import type { NetworkWindow } from "@/lib/analyze/wallet-network";
import type {
  BulkExposeResult,
  CrossAnalysisResult,
  ExposeScanResult,
  ProAlphaScanResult,
  FundTraceResult,
  WalletNetworkResult,
  WalletProfile,
  WalletTrackSnapshot,
} from "@/lib/analyze/types";
import { apiGet } from "@/lib/api-client";
import { crossAnalysisKey } from "@/stores/app-store";

export async function fetchCrossAnalysis(
  contracts: string[]
): Promise<CrossAnalysisResult> {
  return apiGet(
    `/api/analyze/cross?contracts=${encodeURIComponent(contracts.join(","))}`
  );
}

export async function fetchFundTrace(
  contractAddress: string
): Promise<FundTraceResult> {
  return apiGet(
    `/api/analyze/fund-trace?contract=${encodeURIComponent(contractAddress)}`
  );
}

export function crossResultKey(contracts: string[]) {
  return crossAnalysisKey(contracts);
}

export async function fetchWalletAnalyze(
  wallet: string,
  contract: string,
  percent?: number
): Promise<WalletProfile> {
  const params = new URLSearchParams({ wallet, contract });
  if (percent != null) params.set("percent", String(percent));
  return apiGet(`/api/analyze/wallet?${params}`);
}

export async function fetchWalletNetwork(
  wallet: string,
  windowDays: NetworkWindow = 90,
  contract?: string | null
): Promise<WalletNetworkResult> {
  const params = new URLSearchParams({
    wallet,
    window: String(windowDays),
  });
  if (contract) params.set("contract", contract);
  return apiGet(`/api/analyze/network?${params}`);
}

export async function fetchExposeScan(
  contractAddress: string,
  options?: { full?: boolean; refresh?: boolean }
): Promise<ExposeScanResult & { proRequired?: boolean }> {
  const params = new URLSearchParams({ contract: contractAddress });
  if (options?.full === false) params.set("full", "0");
  if (options?.refresh) params.set("refresh", "1");
  return apiGet(`/api/analyze/expose-scan?${params}`);
}

export async function fetchProAlphaScan(
  contractAddress: string,
  options?: { refresh?: boolean }
): Promise<ProAlphaScanResult> {
  const params = new URLSearchParams({ contract: contractAddress });
  if (options?.refresh) params.set("refresh", "1");
  return apiGet(`/api/analyze/pro-alpha?${params}`);
}

export async function fetchBulkExpose(
  contractAddress: string,
  windowDays: NetworkWindow = 90
): Promise<BulkExposeResult> {
  const params = new URLSearchParams({
    contract: contractAddress,
    window: String(windowDays),
  });
  return apiGet(`/api/analyze/expose?${params}`);
}

export async function fetchTrackRefresh(
  wallet: string,
  contract?: string | null
): Promise<WalletTrackSnapshot> {
  const params = new URLSearchParams({ wallet });
  if (contract) params.set("contract", contract);
  return apiGet(`/api/track/refresh?${params}`);
}
