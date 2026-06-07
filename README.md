# EXPOSED.OS

On-chain intelligence terminal for Ethereum. Expose who holds. Expose who they run with.

> Formerly CA.OS — renamed to avoid confusion with other "stalker" products.

## Public pages

| Route | Purpose |
|-------|---------|
| `/` | Marketing landing — what the app does |
| `/pricing` | Free vs Pro tiers + crypto checkout |
| `/app` | Forensics terminal (login required) |

## Stack

- **Next.js 16** (App Router, Railway deployment)
- **PostgreSQL** + **Kysely**
- **Telegram Login** + guest mode (5 searches)
- **Crypto-only billing** — ETH pay or hold tokens

## Plans

| Plan | Default USD (admin-adjustable) |
|------|-------------------------------|
| Weekly | $29 |
| Monthly | $99 |
| Yearly | $799 |

- **Pricing:** `/pricing`
- **Admin:** `/admin` (after bootstrap)
- **Token launch guide:** [docs/TOKEN_LAUNCH.md](docs/TOKEN_LAUNCH.md)

### Create admin (once)

1. Log in with Telegram on `/app`
2. Visit:
   ```
   https://YOUR-URL/api/admin/bootstrap?key=exposed-os-admin-bootstrap-2026&telegram_id=YOUR_TELEGRAM_ID
   ```
3. Open `/admin` to set USD prices, treasury, and token contract

## Local development

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:migrate
npm run dev
```

Open `http://localhost:3000` for landing, `http://localhost:3000/app` for terminal.

## Free vs Pro

| Feature | Free / Guest | EXPOSED.OS Pro |
|---------|--------------|----------------|
| CA analysis | Guest: 5 searches | Unlimited |
| Holder list | Blockscout fallback | Etherscan direct (needs Pro API key on server) |
| Wallet analyze | No | Yes |
| Live tracking + ratings | No | Yes |
| Cross-analysis & fund tracer | No | Yes |
| Syndicate network map | No | Yes |

## License

Private — All rights reserved.
