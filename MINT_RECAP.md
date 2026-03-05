# Mint recap – Divinity homepage

## What you have

- **Where:** Homepage (index.html) – one primary button in the hero.
- **Flow:** Visitor connects Phantom (click “Connect Wallet”) → button becomes “MINT” → click to mint.
- **Price:** **0.005 SOL** per mint (set in `config.json` guards and `script.js` `MINT_PRICE_SOL`).
- **Supply:** Effectively **unlimited** – Candy Machine is configured with a large number (e.g. 100,000 in `config.json`). No per-wallet mint limit; anyone can mint multiple.

## Key files

| File         | Role |
|-------------|------|
| **index.html** | Mint button `#btn-mint`; loads `mint.js` (module) and `script.js`. |
| **script.js**  | `CANDY_MACHINE_ID`, `RPC_URL`, `MINT_PRICE_SOL` (0.005). Wallet connect + `handleMintClick()` calls `window.divinityMint(provider, CANDY_MACHINE_ID, RPC_URL)`. |
| **mint.js**    | `window.divinityMint(provider, candyMachineId, rpcUrl)` – builds mint tx (Umi + mpl-candy-machine mintV2), user signs with Phantom, sends and confirms. |
| **config.json**| Candy Machine config: `solPayment` 0.005, destination = your treasury wallet; `number` = supply cap (e.g. 100000). |

## Checklist for “anyone can mint, 0.005 SOL, unlimited”

1. **Candy Machine deployed** with this config (e.g. `sugar deploy`).  
2. **script.js** has the correct **CANDY_MACHINE_ID** (the one from `sugar deploy`).  
3. **RPC_URL** matches the network (e.g. devnet vs mainnet).  
4. **Site served over HTTPS or localhost** – Phantom does not inject on `file://`; use e.g. `npx serve` and open `http://localhost:3000`.  
5. **config.json** `guards.default.solPayment` = 0.005 and `number` large (e.g. 100000) for “unlimited” supply.

## If mint “doesn’t work”

- Open DevTools (F12) → Console. Look for the exact error when you click MINT.
- Typical causes: wrong network (RPC vs Candy Machine network), wrong Candy Machine ID, Candy Machine not deployed or out of items, or Phantom rejecting the transaction.
- Ensure you’re not opening the site via `file://`; use a local server.
