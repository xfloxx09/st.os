import { getDb } from "@/lib/db";
import type { PricingSettings } from "@/lib/billing/types";

const DEFAULT_PRICING: PricingSettings = {
  weeklyUsd: 29,
  monthlyUsd: 99,
  yearlyUsd: 799,
  holderDiscountPercent: 20,
  tokenSymbol: "CA",
  tokenContract: "",
  treasuryAddress: "",
  etherscanProRequired: true,
};

export async function getPricingSettings(): Promise<PricingSettings> {
  const db = getDb();
  const row = await db
    .selectFrom("app_settings")
    .select(["value"])
    .where("key", "=", "pricing")
    .executeTakeFirst();

  const merged = { ...DEFAULT_PRICING, ...(row?.value as PricingSettings) };
  if (process.env.CA_TOKEN_CONTRACT && !merged.tokenContract) {
    merged.tokenContract = process.env.CA_TOKEN_CONTRACT;
  }
  if (process.env.TREASURY_ADDRESS && !merged.treasuryAddress) {
    merged.treasuryAddress = process.env.TREASURY_ADDRESS;
  }
  return merged;
}

export async function updatePricingSettings(
  settings: PricingSettings,
  adminUserId: number
): Promise<void> {
  const db = getDb();
  const admin = await db
    .selectFrom("users")
    .select(["role"])
    .where("id", "=", adminUserId)
    .executeTakeFirst();

  if (admin?.role !== "admin") {
    throw new Error("Unauthorized");
  }

  await db
    .insertInto("app_settings")
    .values({ key: "pricing", value: JSON.parse(JSON.stringify(settings)) })
    .onConflict((oc) =>
      oc.column("key").doUpdateSet({
        value: JSON.parse(JSON.stringify(settings)),
        updated_at: new Date(),
      })
    )
    .execute();
}
