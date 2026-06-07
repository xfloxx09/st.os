# CA Coin — Token Launch Guide

EXPOSED.OS uses an ERC-20 token for holder-based subscriptions (similar in spirit to [Market Stalker's holder model](https://themarketstalker.com/#pricing), but this is your own token and product).

Reference token (NOT yours — research only): `0x522Ec96bCed6dc26325120EdF3931d34E417a620`

## Goals

1. ERC-20 on Ethereum mainnet
2. Holder access: users hold CA tokens instead of paying full ETH price
3. **Dynamic pricing**: as market cap grows, token price rises → users hold **fewer tokens** for the same USD access (you set target USD in `/admin`)

## Recommended launch stack

| Step | Tool | Cost |
|------|------|------|
| Deploy ERC-20 | [OpenZeppelin Wizard](https://wizard.openzeppelin.com/) or Remix | Gas only |
| Liquidity | Uniswap v2/v3 pool (ETH/CA) | Gas + LP |
| Price feed | DexScreener (already integrated) | Free |
| Verify | Etherscan contract verification | Free |

## Token design (simple)

- **Name:** EXPOSED.OS Token (or your brand)
- **Symbol:** EXPOSED (or CA if already deployed)
- **Supply:** 1,000,000,000 (1B) — adjust as needed
- **Decimals:** 18
- **Features:** No mint after deploy (fixed supply), no tax (cleaner for CEX/DexScreener)

Avoid honeypot / high tax — your app reads balances via Alchemy.

## Deploy checklist

1. Create deployer wallet (hardware wallet recommended)
2. Deploy ERC-20 contract on Ethereum mainnet
3. Verify source on Etherscan
4. Create Uniswap liquidity pool (start with modest LP)
5. Copy contract address → Railway env + Admin panel:
   - `CA_TOKEN_CONTRACT=0x...`
   - Admin → **Token contract** field
6. Set **Treasury address** in admin (wallet that receives ETH payments)
7. Announce CA token address to community

## Configure EXPOSED.OS after launch

### Railway variables

```
CA_TOKEN_CONTRACT=0xYourTokenAddress
```

### Admin panel (`/admin`)

1. Bootstrap admin (once):
   ```
   https://YOUR-URL/api/admin/bootstrap?key=exposed-os-admin-bootstrap-2026&telegram_id=YOUR_TELEGRAM_ID
   ```
2. Log in with Telegram → visit `/admin`
3. Set:
   - Weekly / Monthly / Yearly **USD targets** (what consumers always pay ~in fiat terms)
   - Holder discount % (e.g. 20%)
   - Token contract address
   - Treasury address

## How dynamic holder pricing works

```
tokensRequired = (planUsd × (1 - discount%)) / tokenPriceUsd
```

`tokenPriceUsd` comes from DexScreener live.

| MC growth | Token price | Tokens to hold for $99/mo |
|-----------|-------------|---------------------------|
| $100K | $0.0001 | 990,000 |
| $10M | $0.01 | 9,900 |
| $100M | $0.10 | 990 |

You only change **USD targets** in admin — token amounts update automatically.

## Etherscan API Pro (server-side)

Holder **direct pipeline** also needs [Etherscan API Pro](https://docs.etherscan.io/resources/pro-endpoints) ($49/mo) on the server:

```
ETHERSCAN_API_KEY=your_pro_key
```

EXPOSED.OS Pro subscription unlocks features for users; you add the Pro API key on Railway.

## Security

- Never commit private keys
- Use multisig for treasury once revenue grows
- Rotate API keys if leaked in chat

## Legal

This is engineering guidance only. Consult counsel for token securities/tax implications in your jurisdiction.
