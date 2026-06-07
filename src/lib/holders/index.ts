import { fetchTokenHolders } from "@/lib/etherscan";
import { fetchBlockscoutHolders, type RawHolder } from "@/lib/holders/blockscout";

export type HolderSource = "etherscan" | "blockscout";

export interface HolderFetchResult {
  holders: RawHolder[];
  source: HolderSource;
  warning?: string;
}

export async function fetchTopHolders(
  contractAddress: string,
  limit = 100
): Promise<HolderFetchResult> {
  try {
    const etherscan = await fetchTokenHolders(contractAddress, 1, limit);
    return {
      source: "etherscan",
      holders: etherscan.map((h) => ({
        address: h.TokenHolderAddress.toLowerCase(),
        quantity: h.TokenHolderQuantity,
        label: null,
        isContract: false,
      })),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isProOnly =
      message.toLowerCase().includes("api pro") ||
      message.toLowerCase().includes("upgrade");

    if (!isProOnly) {
      console.warn("[holders] Etherscan failed:", message);
    }

    const blockscout = await fetchBlockscoutHolders(contractAddress, limit);
    if (blockscout.length === 0) {
      throw new Error(
        "Could not fetch token holders. Etherscan Pro required; Blockscout fallback returned no data."
      );
    }

    return {
      source: "blockscout",
      holders: blockscout,
      warning: isProOnly
        ? "Holder list via Blockscout (Etherscan Pro endpoint not available on free tier)"
        : undefined,
    };
  }
}
