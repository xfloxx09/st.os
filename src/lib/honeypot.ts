export interface HoneypotResult {
  isHoneypot: boolean;
  honeypotReason: string | null;
  buyTax: number | null;
  sellTax: number | null;
}

export async function checkHoneypot(
  contractAddress: string
): Promise<HoneypotResult | null> {
  try {
    const url = `https://api.honeypot.is/v2/IsHoneypot?address=${contractAddress}&chainID=1`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return null;

    const json = (await res.json()) as {
      honeypotResult?: {
        isHoneypot?: boolean;
        honeypotReason?: string;
      };
      simulationResult?: {
        buyTax?: number;
        sellTax?: number;
      };
    };

    return {
      isHoneypot: json.honeypotResult?.isHoneypot ?? false,
      honeypotReason: json.honeypotResult?.honeypotReason ?? null,
      buyTax: json.simulationResult?.buyTax ?? null,
      sellTax: json.simulationResult?.sellTax ?? null,
    };
  } catch {
    return null;
  }
}
