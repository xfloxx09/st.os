import type { Generated, Insertable, Selectable } from "kysely";

export interface Database {
  users: UsersTable;
  sessions: SessionsTable;
  search_history: SearchHistoryTable;
  wallet_cache: WalletCacheTable;
  rate_limits: RateLimitsTable;
  schema_migrations: SchemaMigrationsTable;
  guest_sessions: GuestSessionsTable;
  app_settings: AppSettingsTable;
  subscriptions: SubscriptionsTable;
  tracked_wallets: TrackedWalletsTable;
}

export interface UsersTable {
  id: Generated<number>;
  telegram_id: number;
  telegram_username: string | null;
  telegram_first_name: string | null;
  plan: Generated<string>;
  role: Generated<string>;
  wallet_address: string | null;
  created_at: Generated<Date>;
  last_active: Generated<Date>;
}

export interface SessionsTable {
  id: Generated<number>;
  user_id: number;
  token: string;
  expires_at: Date;
  created_at: Generated<Date>;
}

export interface SearchHistoryTable {
  id: Generated<number>;
  user_id: number;
  contract_address: string;
  token_symbol: string | null;
  token_name: string | null;
  searched_at: Generated<Date>;
}

export interface WalletCacheTable {
  id: Generated<number>;
  wallet_address: string;
  cache_type: string;
  data: unknown;
  cached_at: Generated<Date>;
  expires_at: Date;
}

export interface RateLimitsTable {
  id: Generated<number>;
  user_id: number;
  action: string;
  count: Generated<number>;
  window_start: Generated<Date>;
}

export interface SchemaMigrationsTable {
  id: Generated<number>;
  filename: string;
  applied_at: Generated<Date>;
}

export interface GuestSessionsTable {
  id: string;
  search_count: Generated<number>;
  created_at: Generated<Date>;
  expires_at: Date;
}

export interface AppSettingsTable {
  key: string;
  value: unknown;
  updated_at: Generated<Date>;
}

export interface SubscriptionsTable {
  id: Generated<number>;
  user_id: number;
  plan: string;
  payment_method: string;
  status: Generated<string>;
  tx_hash: string | null;
  wallet_address: string | null;
  amount_paid: string | null;
  starts_at: Date;
  expires_at: Date;
  created_at: Generated<Date>;
}

export interface TrackedWalletsTable {
  id: Generated<number>;
  user_id: number;
  wallet_address: string;
  label: string | null;
  source_contract: string | null;
  notes: string | null;
  created_at: Generated<Date>;
  last_checked_at: Date | null;
}

export type User = Selectable<UsersTable>;
export type NewUser = Insertable<UsersTable>;
export type Session = Selectable<SessionsTable>;
export type NewSession = Insertable<SessionsTable>;
