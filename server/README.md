# Divinity Upgrade API

Backend for upgrade submissions (tier 1–3). Records who upgraded; you can manually check `upgrades.json` to see who did tier 3 / paid $20.

## Setup

```bash
cd server
npm install
```

## Run

```bash
npm start
```

Runs on http://localhost:3001. Set `PORT` to change.

## Endpoints

- **POST /api/upgrade** — Submit an upgrade.
  - Body: `{ tier: 1|2|3, solanaWallet, nftMint, choice?: 'angel'|'demon' }`
  - Tier 2 and 3 require `choice` (angel or demon).

Data is stored in `server/upgrades.json`. Open that file to see who did tier 3 (e.g. for $20 payments).
