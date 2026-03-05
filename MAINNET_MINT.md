# Homepage mint on mainnet

To make the **homepage mint** use **mainnet** (real SOL, real NFTs), do the following.

---

## 1. RPC (already set)

- **config.local.js** should set `window.DIVINITY_RPC_URL` to your **mainnet** RPC (e.g. Helius).
- If you use the example and put your key in `config.local.js`, the app already uses mainnet for all calls.

---

## 2. Deploy the Candy Machine on mainnet

The IDs in **script.js** right now (`8hsTvmx...`, `42Eda9P...`) are from **devnet**. Mainnet needs its **own** candy machine.

In the project folder, with your **burner keypair** path (e.g. `burner.json`) and **mainnet RPC** (e.g. your Helius URL):

```powershell
# Point Solana CLI to mainnet (so Sugar uses mainnet)
solana config set --url https://mainnet.helius-rpc.com/?api-key=YOUR_KEY

# Upload assets to Bundlr (costs a small amount of mainnet SOL)
sugar upload -k "C:\path\to\burner.json"

# Create the Candy Machine on mainnet
sugar deploy -k "C:\path\to\burner.json"
```

- Use the **same** `config.json` (treasury `FTCQPhg846q25KuVkQa6Nyb2TYPJjdYayqWdSLBijPBX` is already set).
- After `sugar deploy`, the CLI prints the **Candy Machine ID**. Copy it.
- Sugar updates **cache.json** in the project; open it and copy the **collectionMint** (under `program.collectionMint`).

**Wallet:** The burner needs **mainnet SOL** for upload (Bundlr) and deploy. No devnet faucet on mainnet—use real SOL or a transfer.

---

## 3. Update the website with mainnet IDs

In **script.js**, replace the devnet values with the ones from your **mainnet** deploy:

```js
const CANDY_MACHINE_ID = 'PASTE_MAINNET_CANDY_MACHINE_ID_FROM_SUGAR_DEPLOY';
const COLLECTION_MINT = 'PASTE_MAINNET_COLLECTION_MINT_FROM_CACHE_JSON';
```

- **CANDY_MACHINE_ID** = the ID printed by `sugar deploy` (mainnet).
- **COLLECTION_MINT** = `cache.json` → `program.collectionMint` after that deploy.

Do **not** change `RPC_URL` in script.js if you use **config.local.js** for the mainnet RPC; the fallback in script.js is only for when `config.local.js` is missing.

---

## 4. Summary

| Step | Action |
|------|--------|
| 1 | Set mainnet RPC in **config.local.js** (you already have this). |
| 2 | Fund burner with **mainnet SOL**. |
| 3 | Run `solana config set --url <mainnet RPC>`, then `sugar upload -k "burner.json"`, then `sugar deploy -k "burner.json"`. |
| 4 | Copy **Candy Machine ID** and **collectionMint** (from `cache.json`) into **script.js**. |
| 5 | Users connect Phantom on **Mainnet** and need mainnet SOL to mint (0.005 SOL + a bit for rent). |

After that, the homepage mint is on mainnet: real SOL to your treasury and real NFTs to users.
