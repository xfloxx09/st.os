import { normalizeAddress } from "@/lib/ethereum";

const BASE_URL = "https://eth.blockscout.com/api/v2";
const PAGE_SIZE = 50;

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
  value: string | number;
}

interface BlockscoutHoldersResponse {
  items: BlockscoutHolderItem[];
  next_page_params?: Record<string, string | number> | null;
}

function extractLabel(item: BlockscoutHolderItem): string | null {
  const tags = item.address.metadata?.tags ?? [];
  const named = tags.find((t) => t.tagType === "name");
  return named?.name ?? null;
}

function quantityFromValue(value: string | number | undefined): string {
  if (value == null) return "0";
  if (typeof value === "string") return value.trim() || "0";
  if (!Number.isFinite(value) || value === 0) return "0";
  return String(Math.trunc(value));
}

export async function fetchBlockscoutHolders(
  contractAddress: string,
  limit = 250
): Promise<RawHolder[]> {
  const holders: RawHolder[] = [];
  const seen = new Set<string>();
  let nextParams: Record<string, string> | null = null;

  while (holders.length < limit) {
    const url = new URL(
      `${BASE_URL}/tokens/${normalizeAddress(contractAddress)}/holders`
    );
    if (nextParams) {
      for (const [key, value] of Object.entries(nextParams)) {
        url.searchParams.set(key, value);
      }
    }

    const res = await fetch(url.toString(), { next: { revalidate: 0 } });
    if (!res.ok) break;

    const json = (await res.json()) as BlockscoutHoldersResponse;
    const items = json.items ?? [];
    if (items.length === 0) break;

    for (const item of items) {
      const address = normalizeAddress(item.address.hash);
      if (seen.has(address)) continue;
      seen.add(address);

      holders.push({
        address,
        quantity: quantityFromValue(item.value),
        label: extractLabel(item),
        isContract: item.address.is_contract,
      });
      if (holders.length >= limit) break;
    }

    if (!json.next_page_params || holders.length >= limit) break;

    nextParams = {};
    for (const [key, value] of Object.entries(json.next_page_params)) {
      if (value != null) nextParams[key] = String(value);
    }
    if (Object.keys(nextParams).length === 0) break;
  }

  return holders;
}

export async function fetchAllBlockscoutHolders(
  contractAddress: string,
  maxHolders = 250
): Promise<{ holders: RawHolder[]; capped: boolean }> {
  const holders = await fetchBlockscoutHolders(contractAddress, maxHolders);
  return { holders, capped: holders.length >= maxHolders };
}
