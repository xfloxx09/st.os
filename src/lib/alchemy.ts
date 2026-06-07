import { alchemyQueue } from "@/lib/api-queue";

const BASE_URL = process.env.ALCHEMY_API_KEY
  ? `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  : null;

interface TokenBalanceResult {
  contractAddress: string;
  tokenBalance: string;
}

interface TokenMetadata {
  name: string | null;
  symbol: string | null;
  decimals: number | null;
}

export async function fetchWalletTokenBalances(
  walletAddress: string
): Promise<TokenBalanceResult[]> {
  if (!BASE_URL) return [];

  return alchemyQueue.add(async () => {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "alchemy_getTokenBalances",
        params: [walletAddress, "erc20"],
      }),
    });

    if (!res.ok) return [];
    const json = (await res.json()) as {
      result?: { tokenBalances?: TokenBalanceResult[] };
    };
    return (json.result?.tokenBalances ?? []).filter(
      (t) => t.tokenBalance !== "0x0" && t.tokenBalance !== "0x"
    );
  }) as Promise<TokenBalanceResult[]>;
}

export async function fetchEthBalance(walletAddress: string): Promise<number | null> {
  if (!BASE_URL) return null;

  return alchemyQueue.add(async () => {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getBalance",
        params: [walletAddress, "latest"],
      }),
    });

    if (!res.ok) return null;
    const json = (await res.json()) as { result?: string };
    if (!json.result) return null;
    return Number(BigInt(json.result)) / 1e18;
  }) as Promise<number | null>;
}

export interface AssetTransfer {
  from: string;
  to: string;
  value: number | null;
  blockNum: string;
  hash: string;
  metadata: { blockTimestamp: string | null };
}

export async function fetchTokenTransfers(
  contractAddress: string,
  maxCount = 500
): Promise<AssetTransfer[]> {
  if (!BASE_URL) return [];

  const transfers: AssetTransfer[] = [];
  let pageKey: string | undefined;

  for (let page = 0; page < 3 && transfers.length < maxCount; page++) {
    const batch = (await alchemyQueue.add(async () => {
      const params: Record<string, unknown> = {
        fromBlock: "0x0",
        toBlock: "latest",
        contractAddresses: [contractAddress],
        category: ["erc20"],
        withMetadata: true,
        maxCount: String(Math.min(200, maxCount - transfers.length)),
        order: "desc",
      };
      if (pageKey) params.pageKey = pageKey;

      const res = await fetch(BASE_URL!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "alchemy_getAssetTransfers",
          params: [params],
        }),
      });

      if (!res.ok) return null;
      const json = (await res.json()) as {
        result?: {
          transfers?: Array<{
            from: string;
            to: string;
            value: number | null;
            blockNum: string;
            hash: string;
            metadata?: { blockTimestamp?: string };
          }>;
          pageKey?: string;
        };
      };
      return json.result ?? null;
    })) as {
      transfers?: Array<{
        from: string;
        to: string;
        value: number | null;
        blockNum: string;
        hash: string;
        metadata?: { blockTimestamp?: string };
      }>;
      pageKey?: string;
    } | null;

    if (!batch?.transfers?.length) break;

    for (const tx of batch.transfers) {
      transfers.push({
        from: tx.from,
        to: tx.to,
        value: tx.value,
        blockNum: tx.blockNum,
        hash: tx.hash,
        metadata: { blockTimestamp: tx.metadata?.blockTimestamp ?? null },
      });
    }

    pageKey = batch.pageKey;
    if (!pageKey) break;
  }

  return transfers.slice(0, maxCount);
}

export async function fetchTokenMetadata(
  contractAddress: string
): Promise<TokenMetadata | null> {
  if (!BASE_URL) return null;

  return alchemyQueue.add(async () => {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "alchemy_getTokenMetadata",
        params: [contractAddress],
      }),
    });

    if (!res.ok) return null;
    const json = (await res.json()) as { result?: TokenMetadata };
    return json.result ?? null;
  }) as Promise<TokenMetadata | null>;
}
