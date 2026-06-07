import { normalizeAddress } from "@/lib/ethereum";
import { getPricingSettings } from "@/lib/billing/settings";
import type { PlanInterval } from "@/lib/billing/types";
import { getPublicPricing } from "@/lib/billing/quotes";

export async function verifyHolderBalance(
  walletAddress: string,
  plan: PlanInterval
): Promise<{ ok: boolean; error?: string; balance?: number; required?: number }> {
  const settings = await getPricingSettings();
  if (!settings.tokenContract) {
    return { ok: false, error: "CA token contract not configured yet. See TOKEN_LAUNCH.md" };
  }

  const pricing = await getPublicPricing();
  const quote = pricing.plans.find((p) => p.interval === plan);
  if (!quote?.tokensRequiredHolder) {
    return { ok: false, error: "Token price unavailable. Try again shortly." };
  }

  const { fetchWalletTokenBalances, fetchTokenMetadata } = await import(
    "@/lib/alchemy"
  );

  const balances = await fetchWalletTokenBalances(normalizeAddress(walletAddress));
  const token = balances.find(
    (b) => normalizeAddress(b.contractAddress) === normalizeAddress(settings.tokenContract)
  );

  if (!token) {
    return {
      ok: false,
      error: `No ${settings.tokenSymbol} tokens found in this wallet`,
      required: quote.tokensRequiredHolder,
      balance: 0,
    };
  }

  const meta = await fetchTokenMetadata(settings.tokenContract);
  const decimals = meta?.decimals ?? 18;
  const balance = Number(BigInt(token.tokenBalance)) / 10 ** decimals;
  const required = quote.tokensRequiredHolder;

  if (balance < required) {
    return {
      ok: false,
      error: `Insufficient ${settings.tokenSymbol}. Hold ${required.toLocaleString(undefined, { maximumFractionDigits: 0 })} tokens (${settings.holderDiscountPercent}% holder discount applied).`,
      balance,
      required,
    };
  }

  return { ok: true, balance, required };
}

export async function verifyEthPayment(
  txHash: string,
  plan: PlanInterval,
  fromWallet?: string
): Promise<{ ok: boolean; error?: string }> {
  const settings = await getPricingSettings();
  if (!settings.treasuryAddress) {
    return { ok: false, error: "Treasury address not configured in admin panel" };
  }

  const pricing = await getPublicPricing();
  const quote = pricing.plans.find((p) => p.interval === plan);
  if (!quote?.ethRequired) {
    return { ok: false, error: "ETH price unavailable" };
  }

  const apiKey = process.env.ETHERSCAN_API_KEY ?? "";
  const url = new URL("https://api.etherscan.io/v2/api");
  url.searchParams.set("chainid", "1");
  url.searchParams.set("module", "proxy");
  url.searchParams.set("action", "eth_getTransactionByHash");
  url.searchParams.set("txhash", txHash);
  if (apiKey) url.searchParams.set("apikey", apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) return { ok: false, error: "Could not verify transaction" };

  const json = (await res.json()) as {
    result?: {
      from?: string;
      to?: string;
      value?: string;
      blockNumber?: string | null;
    } | null;
  };

  const tx = json.result;
  if (!tx?.to || !tx.value || !tx.blockNumber) {
    return { ok: false, error: "Transaction not found or still pending" };
  }

  const to = normalizeAddress(tx.to);
  const treasury = normalizeAddress(settings.treasuryAddress);
  if (to !== treasury) {
    return { ok: false, error: "Payment was not sent to the treasury address" };
  }

  if (fromWallet) {
    if (!tx.from) {
      return { ok: false, error: "Transaction sender missing" };
    }
    if (normalizeAddress(tx.from) !== normalizeAddress(fromWallet)) {
      return { ok: false, error: "Sender wallet does not match" };
    }
  }

  const ethSent = Number(BigInt(tx.value)) / 1e18;
  const minEth = quote.ethRequired * 0.98;

  if (ethSent < minEth) {
    return {
      ok: false,
      error: `Insufficient ETH sent. Required ~${quote.ethRequired.toFixed(4)} ETH`,
    };
  }

  return { ok: true };
}
