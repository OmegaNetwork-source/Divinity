# Divinity NFT – Mint contract setup (Solana Candy Machine)

This project uses **Metaplex Candy Machine** via the **Sugar CLI**. Users pay **0.005 SOL** (~50¢) per mint and receive the “Free Mint” angel vs demon NFT.

---

## 1. Prerequisites

- **Node.js** (v18+)
- **Solana CLI**  
  https://docs.solana.com/cli/install-solana-cli-tools  
  Then: `solana config set --url mainnet-beta` (or `devnet` for testing)
- **Sugar CLI**  
  https://developers.metaplex.com/smart-contracts/candy-machine/sugar/installation  
  After install: `sugar --version`

---

## 2. Wallet and RPC

- Create or use a Solana keypair (e.g. `~/.config/solana/id.json`).
- Get SOL for:
  - Upload/storage (Bundlr)
  - Candy Machine deployment
  - Testing mints
- Optional: use a paid RPC (Helius, QuickNode, etc.) for `config.json` and the site.

---

## 3. Edit `config.json`

In the project root, open `config.json` and replace:

| Placeholder | Replace with |
|------------|-------------------------------|
| `YOUR_WALLET_PUBKEY_HERE` | Your Solana wallet public key (creator + deployer). |
| `YOUR_TREASURY_WALLET_PUBKEY_HERE` | Wallet that receives the 0.005 SOL per mint. |

- `creators[0].address`: usually the same as the treasury.
- `guards.default.solPayment.destination`: where mint payments go (0.005 SOL per mint).

---

## 4. Assets (already prepared)

- `assets/0.jpg` – “Free Mint” image (already copied from `Free Mint.jpg`).
- `assets/0.json` – Metadata for that NFT.
- `assets/collection.jpg` + `assets/collection.json` – Collection NFT (same image).

**Larger supply (e.g. 10,000):**

- Duplicate `0.jpg` and `0.json` as `1.jpg`, `1.json` … `9999.jpg`, `9999.json`.
- In `config.json` set `"number": 10000`.

---

## 5. Deploy the Candy Machine (Sugar)

In the project root (where `config.json` and `assets/` are):

```bash
# 1. Upload assets (images + metadata) to Bundlr/Arweave
sugar upload

# 2. Deploy the Candy Machine on Solana
sugar deploy

# 3. Verify (optional)
sugar verify
```

After `sugar deploy`, the CLI prints the **Candy Machine ID** (public key). Copy it.

---

## 6. Connect the website to the Candy Machine

In `script.js` at the top, set:

```js
const CANDY_MACHINE_ID = 'PASTE_YOUR_CANDY_MACHINE_ID_HERE';
const RPC_URL = 'https://api.mainnet-beta.solana.com';  // or your preferred RPC
```

If `CANDY_MACHINE_ID` is empty or missing, the MINT button will show a message to configure it. Once set, the site will use this ID to build the mint transaction (see next section).

---

## 7. How minting works

- **On-chain:** The Candy Machine is a program + account on Solana. It:
  - Holds the list of mintable items (your uploaded metadata + images).
  - Enforces the **solPayment** guard: user pays 0.005 SOL to your treasury, then receives one NFT.

- **Minting:** Once the Candy Machine is deployed:
  - **From the CLI:** Run `sugar mint` in the project folder to mint one NFT (for testing).
  - **From the website:** Set `CANDY_MACHINE_ID` in `script.js`; the MINT button will then prompt you. To enable full “click to mint” in the browser you need to add a mint flow that builds the transaction (e.g. with [Metaplex JavaScript SDK](https://developers.metaplex.com/candy-machine/getting-started/js) or a small backend that returns the transaction for the wallet to sign).

---

## 8. Useful Sugar commands

| Command | Purpose |
|--------|--------|
| `sugar upload` | Upload `assets/` to storage (Bundlr). |
| `sugar deploy` | Create/update Candy Machine on Solana. |
| `sugar verify` | Check upload and config. |
| `sugar mint` | Mint one NFT from the Candy Machine (CLI, for testing). |
| `sugar withdraw` | Close Candy Machine and reclaim rent (use only when done minting). |

---

## 9. Summary

1. Install Solana CLI + Sugar; fund your wallet.
2. Replace `YOUR_WALLET_PUBKEY_HERE` and `YOUR_TREASURY_WALLET_PUBKEY_HERE` in `config.json`.
3. Run `sugar upload` then `sugar deploy`; copy the Candy Machine ID.
4. Set `CANDY_MACHINE_ID` (and optionally `RPC_URL`) in `script.js`.
5. Users can then mint the “Free Mint” NFT from the site for 0.005 SOL.

For more: [Metaplex Candy Machine](https://developers.metaplex.com/candy-machine), [Sugar docs](https://developers.metaplex.com/candy-machine/sugar).
