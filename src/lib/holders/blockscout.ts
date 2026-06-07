import { normalizeAddress } from "@/lib/ethereum";

const BASE_URL = "https://eth.blockscout.com/api/v2";

export interface RawHolder {
  address: string;
  quantity: string;
  label: string | null;
  isContract: boolean;
}

interface BlockscoutHolderItem {
  address: {
    hash: string;
    is_contract: boolean;
    metadata?: {
      tags?: Array<{ name: string; tagType?: string }>;
    };
  };
  value: string;
}

interface BlockscoutHoldersResponse {
  items: BlockscoutHolderItem[];
  next_page_params?: Record<string, unknown> | null;
}

function extractLabel(item: BlockscoutHolderItem): string | null {
  const tags = item.address.metadata?.tags ?? [];
  const named = tags.find((t) => t.tagType === "name");
  return named?.name ?? null;
}

export async function fetchBlockscoutHolders(
  contractAddress: string,
  limit = 100
): Promise<RawHolder[]> {
  const holders: RawHolder[] = [];
  let cursor: string | null = null;

  while (holders.length < limit) {
    const url = new URL(
      `${BASE_URL}/tokens/${normalizeAddress(contractAddress)}/holders`
    );
    if (cursor) {
      url.searchParams.set("address_hash", cursor);
    }

    const res = await fetch(url.toString(), { next: { revalidate: 0 } });
    if (!res.ok) break;

    const json = (await res.json()) as BlockscoutHoldersResponse;
    const items = json.items ?? [];
    if (items.length === 0) break;

    for (const item of items) {
      holders.push({
        address: normalizeAddress(item.address.hash),
        quantity: item.value,
        label: extractLabel(item),
        isContract: item.address.is_contract,
      });
      if (holders.length >= limit) break;
    }

    const nextHash = json.next_page_params?.address_hash;
    if (typeof nextHash !== "string" || nextHash === cursor) break;
    cursor = nextHash;
  }

  return holders;
}
