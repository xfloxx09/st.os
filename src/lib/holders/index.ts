import { fetchAllTokenHolders } from "@/lib/etherscan";
import {
  fetchAllBlockscoutHolders,
  type RawHolder,
} from "@/lib/holders/blockscout";

export type HolderSource = "etherscan" | "blockscout";

/** Top N holders by balance — paginated, not a full token holder census. */
export const HOLDER_FETCH_LIMIT = 250;

export interface HolderFetchResult {
  holders: RawHolder[];
  source: HolderSource;
  warning?: string;
  proRequired?: boolean;
  capped?: boolean;
  maxFetched?: number;
}

function dedupeAndSort(holders: RawHolder[]): RawHolder[] {
  const byAddress = new Map<string, RawHolder>();
  for (const holder of holders) {
    const key = holder.address.toLowerCase();
    const existing = byAddress.get(key);
    if (!existing) {
      byAddress.set(key, holder);
      continue;
    }
    try {
      if (BigInt(holder.quantity) > BigInt(existing.quantity)) {
        byAddress.set(key, holder);
      }
    } catch {
      byAddress.set(key, holder);
    }
  }

  return [...byAddress.values()].sort((a, b) => {
    try {
      const av = BigInt(a.quantity);
      const bv = BigInt(b.quantity);
      if (av > bv) return -1;
      if (av < bv) return 1;
      return 0;
    } catch {
      return 0;
    }
  });
}

export async function fetchTopHolders(
  contractAddress: string,
  limit = HOLDER_FETCH_LIMIT,
  options?: { isPro?: boolean }
): Promise<HolderFetchResult> {
  const maxHolders = limit;

  try {
    const etherscan = await fetchAllTokenHolders(contractAddress, maxHolders);
    const holders = dedupeAndSort(
      etherscan.map((h) => ({
        address: h.TokenHolderAddress.toLowerCase(),
        quantity: h.TokenHolderQuantity,
        label: null,
        isContract: false,
      }))
    );

    return {
      source: "etherscan",
      holders,
      capped: etherscan.length >= maxHolders,
      maxFetched: maxHolders,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isProOnly =
      message.toLowerCase().includes("api pro") ||
      message.toLowerCase().includes("upgrade");

    if (!isProOnly) {
      console.warn("[holders] Etherscan failed:", message);
    }

    const blockscout = await fetchAllBlockscoutHolders(contractAddress, maxHolders);
    if (blockscout.holders.length === 0) {
      throw new Error(
        "Could not fetch token holders. Etherscan Pro required; Blockscout fallback returned no data."
      );
    }

    return {
      source: "blockscout",
      holders: dedupeAndSort(blockscout.holders),
      capped: blockscout.capped,
      maxFetched: maxHolders,
      proRequired: isProOnly,
      warning: isProOnly
        ? options?.isPro
          ? "Etherscan Pro API key required on server — using Blockscout fallback"
          : `Free tier: Blockscout top ${HOLDER_FETCH_LIMIT} holders. Upgrade to EXPOSED.OS Pro for Etherscan pipeline.`
        : blockscout.capped
          ? `Showing top ${maxHolders} holders — token may have more.`
          : undefined,
    };
  }
}
