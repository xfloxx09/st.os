import { fetchTokenHolders } from "@/lib/etherscan";
import { fetchBlockscoutHolders, type RawHolder } from "@/lib/holders/blockscout";

export type HolderSource = "etherscan" | "blockscout";

export interface HolderFetchResult {
  holders: RawHolder[];
  source: HolderSource;
  warning?: string;
  proRequired?: boolean;
}

export async function fetchTopHolders(
  contractAddress: string,
  limit = 100,
  options?: { isPro?: boolean }
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
      proRequired: isProOnly,
      warning: isProOnly
        ? options?.isPro
          ? "Etherscan Pro API key required on server — contact support"
          : "Free tier: Blockscout holders. Upgrade to CA.OS Pro for direct Etherscan pipeline + wallet analyze."
        : undefined,
    };
  }
}
