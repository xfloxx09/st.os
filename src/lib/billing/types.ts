export type PlanInterval = "weekly" | "monthly" | "yearly";

export interface PricingSettings {
  weeklyUsd: number;
  monthlyUsd: number;
  yearlyUsd: number;
  holderDiscountPercent: number;
  tokenSymbol: string;
  tokenContract: string;
  treasuryAddress: string;
  etherscanProRequired: boolean;
}

export interface PlanQuote {
  interval: PlanInterval;
  label: string;
  targetUsd: number;
  holderUsd: number;
  tokenPriceUsd: number | null;
  tokensRequired: number | null;
  tokensRequiredHolder: number | null;
  ethRequired: number | null;
  ethRequiredHolder: number | null;
  days: number;
}

export interface PricingPublicResponse {
  settings: Pick<
    PricingSettings,
    "tokenSymbol" | "tokenContract" | "treasuryAddress" | "holderDiscountPercent"
  >;
  plans: PlanQuote[];
  ethPriceUsd: number | null;
  proBenefits: string[];
  upgradeNote: string;
}
