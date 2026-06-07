import { fetchDexTokenData } from "@/lib/dexscreener";

const WETH_MAINNET = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

export async function fetchEthPriceUsd(): Promise<number | null> {
  const weth = await fetchDexTokenData(WETH_MAINNET).catch(() => null);
  const price = weth?.priceUsd ? Number(weth.priceUsd) : null;
  return price != null && price > 0 ? price : null;
}
