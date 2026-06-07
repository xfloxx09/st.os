import type { CrossAnalysisResult, FundTraceResult } from "@/lib/analyze/types";
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
