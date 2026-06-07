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

## Phase 0 status

- Telegram login + JWT sessions
- PostgreSQL schema (5 tables + cache layer)
- STALKER.OS terminal UI shell
- Railway Docker deployment

**Not yet implemented:** Etherscan, Alchemy, holder analysis, cross-holder engine (Phases 1–3).

## License

Private — All rights reserved.
