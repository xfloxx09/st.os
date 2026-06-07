import { getDb } from "@/lib/db";

export type CacheType =
  | "profile"
  | "trades"
  | "pnl"
  | "fund_origin"
  | "portfolio"
  | "cross_analysis"
  | "ca_analysis"
  | "wallet_network"
  | "expose_scan"
  | "bulk_expose"
  | "pro_alpha";

const TTL_MINUTES: Record<CacheType, number> = {
  profile: 24 * 60,
  portfolio: 15,
  trades: 30,
  pnl: 15,
  fund_origin: 48 * 60,
  cross_analysis: 30,
  ca_analysis: 15,
  wallet_network: 60,
  expose_scan: 30,
  bulk_expose: 45,
  pro_alpha: 45,
};

export function cacheExpiry(cacheType: CacheType): Date {
  const minutes = TTL_MINUTES[cacheType];
  return new Date(Date.now() + minutes * 60 * 1000);
}

export async function getCachedWalletData<T>(
  walletAddress: string,
  cacheType: CacheType
): Promise<T | null> {
  const db = getDb();
  const row = await db
    .selectFrom("wallet_cache")
    .select(["data", "expires_at"])
    .where("wallet_address", "=", walletAddress.toLowerCase())
    .where("cache_type", "=", cacheType)
    .executeTakeFirst();

  if (!row || row.expires_at < new Date()) return null;
  return row.data as T;
}

export async function setCachedWalletData(
  walletAddress: string,
  cacheType: CacheType,
  data: unknown,
  expiresAt?: Date
): Promise<void> {
  const db = getDb();
  const address = walletAddress.toLowerCase();
  const expiry = expiresAt ?? cacheExpiry(cacheType);

  await db
    .insertInto("wallet_cache")
    .values({
      wallet_address: address,
      cache_type: cacheType,
      data: JSON.parse(JSON.stringify(data)),
      expires_at: expiry,
    })
    .onConflict((oc) =>
      oc.columns(["wallet_address", "cache_type"]).doUpdateSet({
        data: JSON.parse(JSON.stringify(data)),
        cached_at: new Date(),
        expires_at: expiry,
      })
    )
    .execute();
}

export async function purgeExpiredCache(): Promise<number> {
  const db = getDb();
  const result = await db
    .deleteFrom("wallet_cache")
    .where("expires_at", "<", new Date())
    .executeTakeFirst();
  return Number(result.numDeletedRows ?? 0);
}
