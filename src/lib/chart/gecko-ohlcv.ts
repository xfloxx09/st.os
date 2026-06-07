import type { TokenChartPoint } from "@/lib/analyze/types";

interface GeckoOhlcvResponse {
  data?: {
    attributes?: {
      ohlcv_list?: Array<[number, number, number, number, number, number]>;
    };
  };
}

export async function fetchPoolOhlcvHourly(
  poolAddress: string,
  limit = 168
): Promise<TokenChartPoint[]> {
  const url = `https://api.geckoterminal.com/api/v2/networks/eth/pools/${poolAddress}/ohlcv/hour?aggregate=1&limit=${limit}&currency=usd`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });
  if (!res.ok) return [];

  const json = (await res.json()) as GeckoOhlcvResponse;
  const list = json.data?.attributes?.ohlcv_list ?? [];

  return list
    .map((row) => ({
      timestamp: new Date(row[0] * 1000).toISOString(),
      priceUsd: row[4],
    }))
    .filter((p) => p.priceUsd > 0)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}
