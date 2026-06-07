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
