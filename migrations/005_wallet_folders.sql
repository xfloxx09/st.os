CREATE TABLE IF NOT EXISTS tracked_wallet_folders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(80) NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_track_folders_user
  ON tracked_wallet_folders(user_id, sort_order);

ALTER TABLE tracked_wallets
  ADD COLUMN IF NOT EXISTS folder_id INTEGER REFERENCES tracked_wallet_folders(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS wallet_aliases (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_address VARCHAR(42) NOT NULL,
  nickname VARCHAR(80) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, wallet_address)
);

CREATE INDEX IF NOT EXISTS idx_wallet_aliases_user
  ON wallet_aliases(user_id);
