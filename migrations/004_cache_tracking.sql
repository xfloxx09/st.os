-- Wallet profile cache uses composite keys (wallet|contract), not bare addresses
ALTER TABLE wallet_cache
  ALTER COLUMN wallet_address TYPE VARCHAR(200);

CREATE TABLE IF NOT EXISTS tracked_wallets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_address VARCHAR(42) NOT NULL,
  label VARCHAR(100),
  source_contract VARCHAR(42),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_checked_at TIMESTAMPTZ,
  UNIQUE(user_id, wallet_address)
);

CREATE INDEX IF NOT EXISTS idx_tracked_wallets_user
  ON tracked_wallets(user_id, created_at DESC);
