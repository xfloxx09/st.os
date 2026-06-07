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
import { crossAnalysisKey } from "@/stores/app-store";

export async function fetchCrossAnalysis(
  contracts: string[]
): Promise<CrossAnalysisResult> {
  const res = await fetch(
    `/api/analyze/cross?contracts=${encodeURIComponent(contracts.join(","))}`
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Cross-analysis failed");
  return data as CrossAnalysisResult;
}

export async function fetchFundTrace(
  contractAddress: string
): Promise<FundTraceResult> {
  const res = await fetch(
    `/api/analyze/fund-trace?contract=${encodeURIComponent(contractAddress)}`
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Fund trace failed");
  return data as FundTraceResult;
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
  const res = await fetch(`/api/analyze/wallet?${params}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Analyze failed");
  return data as WalletProfile;
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
  const res = await fetch(`/api/analyze/network?${params}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Network analysis failed");
  return data as WalletNetworkResult;
}

export async function fetchExposeScan(
  contractAddress: string,
  options?: { full?: boolean; refresh?: boolean }
): Promise<ExposeScanResult & { proRequired?: boolean }> {
  const params = new URLSearchParams({ contract: contractAddress });
  if (options?.full === false) params.set("full", "0");
  if (options?.refresh) params.set("refresh", "1");
  const res = await fetch(`/api/analyze/expose-scan?${params}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Expose scan failed");
  return data as ExposeScanResult & { proRequired?: boolean };
}

export async function fetchProAlphaScan(
  contractAddress: string,
  options?: { refresh?: boolean }
): Promise<ProAlphaScanResult> {
  const params = new URLSearchParams({ contract: contractAddress });
  if (options?.refresh) params.set("refresh", "1");
  const res = await fetch(`/api/analyze/pro-alpha?${params}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Pro alpha scan failed");
  return data as ProAlphaScanResult;
}

export async function fetchBulkExpose(
  contractAddress: string,
  windowDays: NetworkWindow = 90
): Promise<BulkExposeResult> {
  const params = new URLSearchParams({
    contract: contractAddress,
    window: String(windowDays),
  });
  const res = await fetch(`/api/analyze/expose?${params}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Bulk expose failed");
  return data as BulkExposeResult;
}

export async function fetchTrackRefresh(
  wallet: string,
  contract?: string | null
): Promise<WalletTrackSnapshot> {
  const params = new URLSearchParams({ wallet });
  if (contract) params.set("contract", contract);
  const res = await fetch(`/api/track/refresh?${params}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Track refresh failed");
  return data as WalletTrackSnapshot;
}
