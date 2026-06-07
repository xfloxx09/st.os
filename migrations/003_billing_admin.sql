ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_address VARCHAR(42);

CREATE TABLE IF NOT EXISTS app_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan VARCHAR(20) NOT NULL,
  payment_method VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'active' NOT NULL,
  tx_hash VARCHAR(66),
  wallet_address VARCHAR(42),
  amount_paid VARCHAR(100),
  starts_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id, expires_at DESC);

INSERT INTO app_settings (key, value)
VALUES (
  'pricing',
  '{
    "weeklyUsd": 29,
    "monthlyUsd": 99,
    "yearlyUsd": 799,
    "holderDiscountPercent": 20,
    "tokenSymbol": "CA",
    "tokenContract": "",
    "treasuryAddress": "",
    "etherscanProRequired": true
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
