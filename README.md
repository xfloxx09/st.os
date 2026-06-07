# CA.OS

Contract Address intelligence terminal for Ethereum tokens. Paste a CA, analyze holders, trace fund origins, map wallet relationships, and track alpha wallets live.

> Renamed from STALKER.OS to avoid confusion with [Market Stalker](https://themarketstalker.com/) — a separate product.

## Stack

- **Next.js 16** (App Router, Railway deployment)
- **PostgreSQL** + **Kysely**
- **Telegram Login** + guest mode (5 searches)
- **Crypto-only billing** — ETH pay or hold **CA** tokens

## Delivery phases (complete)

| Phase | Scope | Status |
|-------|--------|--------|
| **0** | Auth, DB schema, OS shell, Railway deploy | ✅ |
| **1** | CA analyze, token overview, holder roster, search history | ✅ |
| **2** | Wallet analyze, fund origin, trades, PNL, portfolio, live tracking | ✅ |
| **3** | Cross-holder engine, shared fund tracer, insider scoring | ✅ |

### Phase 3 features

- **Cross-analysis** — select 2–5 tokens (sidebar checkboxes) → find overlapping holders + insider score
- **Fund tracer** — trace top holders' funding paths → detect shared sources / clusters
- **Pro-gated** — requires CA.OS Pro subscription

## Plans

| Plan | Default USD (admin-adjustable) |
|------|-------------------------------|
| Weekly | $29 |
| Monthly | $99 |
| Yearly | $799 |

Holder discount: 20% off when holding CA tokens. Token amount auto-adjusts with MC so USD cost stays flat.

- **Pricing:** `/pricing`
- **Admin:** `/admin` (after bootstrap)
- **Token launch guide:** [docs/TOKEN_LAUNCH.md](docs/TOKEN_LAUNCH.md)

### Create admin (once)

1. Log in with Telegram on your deployed site
2. Visit:
   ```
   https://YOUR-URL/api/admin/bootstrap?key=ca-os-admin-bootstrap-2026&telegram_id=YOUR_TELEGRAM_ID
   ```
3. Open `/admin` to set USD prices, treasury, and CA token contract

## Local development

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:migrate
npm run dev
```

## Railway deployment

1. Repo: [github.com/xfloxx09/st.os](https://github.com/xfloxx09/st.os)
2. Set env vars from `.env.example`
3. Migrations run via `railway.toml` pre-deploy
4. Health: `/api/live`

## Pro vs Free

| Feature | Free / Guest | CA.OS Pro |
|---------|--------------|-----------|
| CA analysis | Guest: 5 searches | Unlimited |
| Holder list | Blockscout fallback | Etherscan direct (needs Pro API key on server) |
| Wallet analyze | No | Yes |
| Live wallet tracking + alpha rating | No | Yes |
| Cross-holder analysis | No | Yes |
| Fund tracer (shared origins) | No | Yes |
| Mergeable / tabbed windows | Yes | Yes |

[Etherscan tokenholderlist](https://docs.etherscan.io/api-reference/endpoint/tokenholderlist) requires API Pro ($49/mo) server-side.

## License

Private — All rights reserved.
