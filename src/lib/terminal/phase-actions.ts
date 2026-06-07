import type {
  CrossAnalysisResult,
  FundTraceResult,
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
