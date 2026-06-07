function isHumanDecimal(raw: string): boolean {
  if (!raw.includes(".")) return false;
  const n = parseFloat(raw);
  return Number.isFinite(n) && n < 1e15;
}

export function parseRawTokenAmount(raw: string, decimals = 18): bigint {
  const cleaned = raw.trim();
  if (!cleaned) return BigInt(0);

  if (isHumanDecimal(cleaned)) {
    const n = parseFloat(cleaned);
    return BigInt(Math.floor(n * 10 ** decimals));
  }

  if (cleaned.includes(".")) {
    const [whole, frac = ""] = cleaned.split(".");
    const fracPadded = frac.padEnd(decimals, "0").slice(0, decimals);
    return (
      BigInt(whole || "0") * BigInt(10 ** decimals) + BigInt(fracPadded || "0")
    );
  }

  try {
    return BigInt(cleaned);
  } catch {
    return BigInt(0);
  }
}

export function rawToHuman(raw: string, decimals: number): number {
  if (isHumanDecimal(raw)) {
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : 0;
  }

  const amount = parseRawTokenAmount(raw, decimals);
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const frac = amount % divisor;
  return Number(whole) + Number(frac) / Number(divisor);
}

export function percentOfRawSupply(
  balanceRaw: string,
  supplyRaw: bigint,
  decimals = 18
): number {
  if (supplyRaw <= BigInt(0)) return 0;
  const balance = parseRawTokenAmount(balanceRaw, decimals);
  if (balance <= BigInt(0)) return 0;
  const scaled = (balance * BigInt(10000)) / supplyRaw;
  return Number(scaled) / 100;
}

export function resolveTotalSupplyRaw(
  etherscanSupply: string | undefined,
  holders: Array<{ quantity: string }>,
  decimals: number,
  marketCap: number | null,
  priceUsd: number | null
): bigint {
  let supply = parseRawTokenAmount(etherscanSupply ?? "0", decimals);

  if (supply <= BigInt(0) && marketCap != null && priceUsd != null && priceUsd > 0) {
    const estimatedHuman = marketCap / priceUsd;
    supply = BigInt(Math.floor(estimatedHuman * 10 ** decimals));
  }

  if (supply <= BigInt(0) && holders.length > 0) {
    supply = holders.reduce(
      (sum, holder) => sum + parseRawTokenAmount(holder.quantity, decimals),
      BigInt(0)
    );
  }

  return supply;
}
