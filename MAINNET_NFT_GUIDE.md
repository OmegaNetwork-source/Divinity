# Turn Angels + Demons into mainnet NFTs

This guide gets your **assets/Angels** and **assets/Demons** images into a Sugar Candy Machine on **Solana mainnet** so users can mint real NFTs from your site.

---

## 1. Build the NFT assets folder

Your Angels and Demons images need to be in Sugar’s format: numbered pairs like `0.png`, `0.json`, `1.png`, `1.json`, … in one folder.

From the project root (where `config.json` is), run:

```powershell
node build-nft-assets.js
```

This script:

- Reads **assets/Angels/Angels/images/** (all images, sorted by number)
- Reads **assets/Demons/Demons/images/** (same)
- Writes **assets_nft/** with:
  - All Angels first (e.g. `0` … `9999` if you have 10k Angels)
  - Then all Demons (e.g. `10000` … `19999` if you have 10k Demons)
  - Each has a matching `.json` with name, description, and traits (Realm: Angel or Demon).

**Target:** ~10k Angels + ~10k Demons ≈ **20k total**. Put that many images in each folder; the script uses whatever count you have. You should see e.g. `Wrote 20000 assets to assets_nft`.

---

## 2. Swap in the new assets for Sugar

Sugar uses the **assets** folder. So use the built folder in its place:

1. **Back up** your current `assets` (e.g. rename to `assets_backup`).
2. **Rename** `assets_nft` to **`assets`** (so Sugar sees 0.png, 0.json, …, 4999.png, 4999.json and your collection files if you add them).
3. Optional: copy **collection.json** and **collection.jpg** (or your collection image) from the backup into the new `assets` if you use a collection image.

---

## 3. Update config.json for unique NFTs

For **unique** images (no hidden settings), your **config.json** must:

- Set **`number`** to the total supply (e.g. **20000** if you have ~10k Angels + ~10k Demons).
- **Remove** the **`hiddenSettings`** block entirely (delete the whole `"hiddenSettings": { ... }` section).

Leave everything else as-is (creators, `solPayment`, etc.). Example of what to change:

- `"number": 100000` → `"number": 20000` (or whatever total the script printed)
- Delete from `"hiddenSettings": {` through its closing `}`.

---

## 4. Mainnet: RPC and wallet

- **RPC:** Use a mainnet RPC (e.g. [Helius](https://helius.dev), [QuickNode](https://quicknode.com)). Set it in **config.local.js** as `window.DIVINITY_RPC_URL` if your site uses that, or pass it to Sugar with `-r <RPC_URL>`.
- **Wallet:** Use a keypair that will pay for upload and deploy (and that you set as creator in config). It must hold **mainnet SOL** (no devnet faucet on mainnet).

```powershell
# Example: point Solana CLI to mainnet
solana config set --url https://mainnet-beta.solana.com

# Or your preferred RPC, e.g. Helius:
# solana config set --url "https://mainnet.helius-rpc.com/?api-key=YOUR_KEY"
```

---

## 5. Upload and deploy on mainnet

From the project root, with the **assets** folder and **config.json** updated as above:

```powershell
# Upload images + metadata to Bundlr (costs some mainnet SOL)
sugar upload -k "C:\path\to\your-keypair.json"

# Create the Candy Machine on mainnet
sugar deploy -k "C:\path\to\your-keypair.json"
```

- **sugar upload** reads `assets/` and uploads to Bundlr; your keypair pays.
- **sugar deploy** creates the Candy Machine on mainnet and prints the **Candy Machine ID**.

If you use a custom RPC:

```powershell
sugar upload -k "C:\path\to\your-keypair.json" -r "https://your-mainnet-rpc.com"
sugar deploy -k "C:\path\to\your-keypair.json" -r "https://your-mainnet-rpc.com"
```

After deploy, open **cache.json** and copy **`program.collectionMint`** (your collection NFT address).

---

## 6. Point your site to mainnet

In **script.js** (or wherever your mint config lives), set:

- **CANDY_MACHINE_ID** = the ID printed by `sugar deploy`
- **COLLECTION_MINT** = `program.collectionMint` from **cache.json**
- **RPC** = your mainnet RPC (or keep using config.local.js for the URL)

Users connect Phantom (or another wallet) on **mainnet** and need mainnet SOL to mint (e.g. 0.005 SOL per mint plus a small amount for rent).

---

## Summary

| Step | What to do |
|------|------------|
| 1 | Run `node build-nft-assets.js` → creates **assets_nft/** |
| 2 | Backup **assets**, rename **assets_nft** → **assets** |
| 3 | In **config.json**: set `number` to your total (e.g. 20000 for ~10k+10k) and remove `hiddenSettings` |
| 4 | Fund your keypair with mainnet SOL; set mainnet RPC |
| 5 | Run `sugar upload -k keypair.json` then `sugar deploy -k keypair.json` |
| 6 | Put Candy Machine ID and collection mint in **script.js** (and mainnet RPC if needed) |

After that, your Angels and Demons are on mainnet as mintable NFTs.
