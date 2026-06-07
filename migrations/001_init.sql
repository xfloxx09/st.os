CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  telegram_username VARCHAR(255),
  telegram_first_name VARCHAR(255),
  plan VARCHAR(50) DEFAULT 'free' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_active TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(512) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

CREATE TABLE IF NOT EXISTS search_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contract_address VARCHAR(42) NOT NULL,
  token_symbol VARCHAR(50),
  token_name VARCHAR(100),
  searched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_search_history_user_searched
  ON search_history(user_id, searched_at DESC);

CREATE TABLE IF NOT EXISTS wallet_cache (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) NOT NULL,
  cache_type VARCHAR(50) NOT NULL,
  data JSONB NOT NULL,
  cached_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(wallet_address, cache_type)
);

CREATE INDEX IF NOT EXISTS idx_wallet_cache_lookup
  ON wallet_cache(wallet_address, cache_type);
CREATE INDEX IF NOT EXISTS idx_wallet_cache_expires ON wallet_cache(expires_at);

CREATE TABLE IF NOT EXISTS rate_limits (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  count INTEGER DEFAULT 1 NOT NULL,
  window_start TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action
  ON rate_limits(user_id, action, window_start DESC);
