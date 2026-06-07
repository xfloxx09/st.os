const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export function isValidEthAddress(address: string): boolean {
  return ADDRESS_RE.test(address.trim());
}

export function normalizeAddress(address: string): string {
  return address.trim().toLowerCase();
}

export function truncateAddress(address: string, chars = 4): string {
  if (address.length < chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatUsd(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "--";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  if (value >= 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toExponential(2)}`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "--";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function usdToEth(
  usd: number | null | undefined,
  ethPriceUsd: number | null | undefined
): number | null {
  if (usd == null || ethPriceUsd == null || ethPriceUsd <= 0 || Number.isNaN(usd)) {
    return null;
  }
  return usd / ethPriceUsd;
}

export function formatEth(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "--";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(2)}K Ξ`;
  if (abs >= 1) return `${sign}${abs.toFixed(4)} Ξ`;
  if (abs >= 0.0001) return `${sign}${abs.toFixed(6)} Ξ`;
  return `${sign}${abs.toExponential(2)} Ξ`;
}

export type PnlDisplayCurrency = "eth" | "usd";

export function formatPnlValue(
  usd: number | null | undefined,
  currency: PnlDisplayCurrency,
  ethPriceUsd: number | null | undefined
): string {
  if (currency === "usd") return formatUsd(usd);
  return formatEth(usdToEth(usd, ethPriceUsd));
}
