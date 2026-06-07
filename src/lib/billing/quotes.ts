import { fetchDexTokenData } from "@/lib/dexscreener";
import type {
  PlanInterval,
  PlanQuote,
  PricingPublicResponse,
  PricingSettings,
} from "@/lib/billing/types";
import { getPricingSettings } from "@/lib/billing/settings";

const PLAN_DAYS: Record<PlanInterval, number> = {
  weekly: 7,
  monthly: 30,
  yearly: 365,
};

const PLAN_LABELS: Record<PlanInterval, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

async function fetchEthPrice(): Promise<number | null> {
  const weth = await fetchDexTokenData(
    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
  ).catch(() => null);
  return weth?.priceUsd ? Number(weth.priceUsd) : null;
}

function tokensForUsd(usd: number, tokenPriceUsd: number | null): number | null {
  if (!tokenPriceUsd || tokenPriceUsd <= 0) return null;
  return usd / tokenPriceUsd;
}

function ethForUsd(usd: number, ethPriceUsd: number | null): number | null {
  if (!ethPriceUsd || ethPriceUsd <= 0) return null;
  return usd / ethPriceUsd;
}

function buildPlanQuote(
  interval: PlanInterval,
  settings: PricingSettings,
  tokenPriceUsd: number | null,
  ethPriceUsd: number | null
): PlanQuote {
  const targetUsd =
    interval === "weekly"
      ? settings.weeklyUsd
      : interval === "monthly"
        ? settings.monthlyUsd
        : settings.yearlyUsd;

  const holderUsd = targetUsd * (1 - settings.holderDiscountPercent / 100);

  return {
    interval,
    label: PLAN_LABELS[interval],
    targetUsd,
    holderUsd,
    tokenPriceUsd,
    tokensRequired: tokensForUsd(targetUsd, tokenPriceUsd),
    tokensRequiredHolder: tokensForUsd(holderUsd, tokenPriceUsd),
    ethRequired: ethForUsd(targetUsd, ethPriceUsd),
    ethRequiredHolder: ethForUsd(holderUsd, ethPriceUsd),
    days: PLAN_DAYS[interval],
  };
}

export async function getPublicPricing(): Promise<PricingPublicResponse> {
  const settings = await getPricingSettings();
  let tokenPriceUsd: number | null = null;

  if (settings.tokenContract) {
    const dex = await fetchDexTokenData(settings.tokenContract).catch(() => null);
    tokenPriceUsd = dex?.priceUsd ? Number(dex.priceUsd) : null;
  }

  const ethPriceUsd = await fetchEthPrice();

  const plans: PlanQuote[] = (
    ["weekly", "monthly", "yearly"] as PlanInterval[]
  ).map((interval) =>
    buildPlanQuote(interval, settings, tokenPriceUsd, ethPriceUsd)
  );

  return {
    settings: {
      tokenSymbol: settings.tokenSymbol,
      tokenContract: settings.tokenContract,
      treasuryAddress: settings.treasuryAddress,
      holderDiscountPercent: settings.holderDiscountPercent,
    },
    plans,
    ethPriceUsd,
    proBenefits: [
      "Direct Etherscan holder pipeline (no Blockscout fallback)",
      "Unlimited CA analysis (no guest cap)",
      "Wallet analyze + live tracking on all holders",
      "Cross-holder analysis + fund tracer + FBI network map",
      "Priority API rate limits",
    ],
    upgradeNote:
      "Free tier uses Blockscout for holders because Etherscan tokenholderlist requires API Pro ($49/mo server-side). CA.OS Pro unlocks the full forensics stack — pay with ETH or hold CA tokens.",
  };
}
