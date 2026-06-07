export interface DexPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { address: string; name: string; symbol: string };
  priceNative: string;
  priceUsd: string;
  liquidity?: { usd?: number; base?: number; quote?: number };
  marketCap?: number;
  volume?: { h24?: number };
  priceChange?: { h24?: number };
}

export interface DexTokenResponse {
  pairs: DexPair[] | null;
}

export async function fetchDexTokenData(
  contractAddress: string
): Promise<DexPair | null> {
  const url = `https://api.dexscreener.com/latest/dex/tokens/${contractAddress}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) return null;

  const json = (await res.json()) as DexTokenResponse;
  const pairs = json.pairs ?? [];
  if (pairs.length === 0) return null;

  return pairs.sort(
    (a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0)
  )[0];
}
