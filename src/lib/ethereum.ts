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

function trimTrailingZeros(numStr: string): string {
  if (!numStr.includes(".")) return numStr;
  return numStr.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

function formatDecimal(abs: number, decimals: number): string {
  return trimTrailingZeros(abs.toFixed(decimals));
}

export function formatUsd(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "--";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);

  if (abs < 1e-12) return "$0.00";
  if (abs >= 1_000_000) return `${sign}$${formatDecimal(abs / 1_000_000, 2)}M`;
  if (abs >= 1_000) return `${sign}$${formatDecimal(abs / 1_000, 2)}K`;
  if (abs >= 1) return `${sign}$${formatDecimal(abs, 2)}`;
  if (abs >= 0.01) return `${sign}$${formatDecimal(abs, 4)}`;
  if (abs >= 0.0001) return `${sign}$${formatDecimal(abs, 6)}`;
  if (abs >= 0.000001) return `${sign}$${formatDecimal(abs, 8)}`;
  return `${sign}$${formatDecimal(abs, 10)}`;
}

/** Human-readable token balance (not USD). */
export function formatTokenAmount(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "--";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (abs < 1e-12) return "0";
  if (abs >= 1_000_000) {
    return `${sign}${abs.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }
  if (abs >= 1) {
    return `${sign}${abs.toLocaleString(undefined, { maximumFractionDigits: 4 })}`;
  }
  if (abs >= 0.0001) return `${sign}${formatDecimal(abs, 6)}`;
  if (abs >= 0.000001) return `${sign}${formatDecimal(abs, 8)}`;
  return `${sign}${formatDecimal(abs, 10)}`;
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

  if (abs < 1e-12) return "0.00 Ξ";
  if (abs >= 1000) return `${sign}${formatDecimal(abs / 1000, 2)}K Ξ`;
  if (abs >= 1) return `${sign}${formatDecimal(abs, 4)} Ξ`;
  if (abs >= 0.0001) return `${sign}${formatDecimal(abs, 6)} Ξ`;
  if (abs >= 0.000001) return `${sign}${formatDecimal(abs, 8)} Ξ`;
  return `${sign}${formatDecimal(abs, 10)} Ξ`;
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
