import { analyzeContractAddress } from "@/lib/analyze/ca-analyzer";
import type { CaAnalysisResult } from "@/lib/analyze/types";
import { getCachedWalletData } from "@/lib/cache/wallet-cache";
import { normalizeAddress } from "@/lib/ethereum";

/** Reuse cached CA analysis when available — avoids re-fetching 250 holders. */
export async function loadCaAnalysis(
  contractAddress: string,
  options?: { isPro?: boolean; refresh?: boolean }
): Promise<CaAnalysisResult> {
  const normalized = normalizeAddress(contractAddress);

  if (!options?.refresh) {
    const cached = await getCachedWalletData<CaAnalysisResult>(
      normalized,
      "ca_analysis"
    );
    if (cached && cached.allHolders.length > 0) {
      return { ...cached, cached: true };
    }
  }

  return analyzeContractAddress(normalized, { isPro: options?.isPro });
}
