import { getDb } from "@/lib/db";
import { normalizeAddress } from "@/lib/ethereum";

const MAX_HISTORY = 20;

export async function recordSearch(
  userId: number,
  contractAddress: string,
  tokenSymbol: string | null,
  tokenName: string | null
) {
  const db = getDb();
  const address = normalizeAddress(contractAddress);

  const existing = await db
    .selectFrom("search_history")
    .select("id")
    .where("user_id", "=", userId)
    .where("contract_address", "=", address)
    .executeTakeFirst();

  if (existing) {
    await db
      .updateTable("search_history")
      .set({
        token_symbol: tokenSymbol,
        token_name: tokenName,
        searched_at: new Date(),
      })
      .where("id", "=", existing.id)
      .execute();
  } else {
    await db
      .insertInto("search_history")
      .values({
        user_id: userId,
        contract_address: address,
        token_symbol: tokenSymbol,
        token_name: tokenName,
      })
      .execute();
  }

  const rows = await db
    .selectFrom("search_history")
    .select("id")
    .where("user_id", "=", userId)
    .orderBy("searched_at", "desc")
    .execute();

  if (rows.length > MAX_HISTORY) {
    const toDelete = rows.slice(MAX_HISTORY).map((r) => r.id);
    await db
      .deleteFrom("search_history")
      .where("id", "in", toDelete)
      .execute();
  }
}

export async function getSearchHistory(userId: number) {
  const db = getDb();
  return db
    .selectFrom("search_history")
    .select(["id", "contract_address", "token_symbol", "token_name", "searched_at"])
    .where("user_id", "=", userId)
    .orderBy("searched_at", "desc")
    .limit(MAX_HISTORY)
    .execute();
}
