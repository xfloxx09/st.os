# STALKER.OS

Browser-based on-chain intelligence terminal for Ethereum tokens. Paste a contract address, stalk the holders, trace fund origins, and map cross-holder relationships.

## Stack

- **Next.js 16** (App Router, Railway deployment)
- **PostgreSQL** + **Kysely** (cache + sessions only)
- **Telegram Login Widget** (auth)
- **Zustand** + **TanStack Query** (client state)

## Local development

### Prerequisites

- Node.js 20+
- Docker (optional, for local Postgres)

### Setup

```bash
cp .env.example .env
# Edit .env with your secrets

docker compose up -d
npm install
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Telegram auth

1. Create a bot via [@BotFather](https://t.me/BotFather) — save `TELEGRAM_BOT_TOKEN`.
2. Set `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` to the bot username (without `@`).
3. For production: `/setdomain` in BotFather must match your Railway domain exactly.

## Railway deployment

1. Repo: [github.com/xfloxx09/st.os](https://github.com/xfloxx09/st.os)
2. Connect Railway web service to this repo (`main` branch).
3. Reference `DATABASE_URL` from Railway Postgres.
4. Set env vars from `.env.example` (production values).
5. Pre-deploy runs `node scripts/migrate.mjs` via `railway.toml`.
6. Health check: `/api/live`

### Branches

| Branch | Purpose |
|--------|---------|
| `main` | Production (Railway auto-deploy) |
| `develop` | Integration |
| `phase/0-foundation` | Phase 0 — auth + OS shell |
| `phase/1-core-pipeline` | CA input, holders (next) |

## Phase status

**Phase 0 (complete)**
- Telegram login + JWT sessions
- PostgreSQL schema (5 tables + cache layer)
- STALKER.OS terminal UI shell
- Railway Docker deployment

**Phase 1 (complete)**
- CA input + Etherscan token metadata + holder list
- DexScreener price/liquidity/volume
- Honeypot.is risk flags
- Known wallet label filtering (CEX/DEX/bridges/burn)
- Token Overview + Holder Roster panels
- Search history (max 20, clickable sidebar)
- TTL caching + rate limits on `/api/analyze/ca`

**Phase 2 (partial)**
- Guest mode: 5 CA searches without Telegram
- Wallet STALK panel: fund origin, token trades, PNL estimate, portfolio (Alchemy)
- STALK button enabled for Telegram users

**Not yet implemented:** Cross-holder analysis engine (Phase 3).

### Phase 1 env vars

Add `ETHERSCAN_API_KEY` to Railway and `.env` (free tier works for launch).

## License

Private — All rights reserved.
