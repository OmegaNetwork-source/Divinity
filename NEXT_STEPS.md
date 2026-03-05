# What to do next – Divinity mint & site

Do these in order. When you’re done, users can mint your NFT from the site (and later upgrade it).

---

## Step 1: Install tools (one-time)

1. **Solana CLI**  
   - https://docs.solana.com/cli/install-solana-cli-tools  
   - Then: `solana config set --url devnet` (use `mainnet-beta` when you’re ready for real SOL)

2. **Sugar CLI** (Metaplex Candy Machine)  
   - https://developers.metaplex.com/smart-contracts/candy-machine/sugar/installation  
   - Check: `sugar --version`

3. **Wallet**  
   - Create or use a keypair: `solana keypair new` (saves to `~/.config/solana/id.json`).  
   - Get SOL for that wallet (e.g. devnet: `solana airdrop 2`).

---

## Step 2: Put your wallet in the config

1. Open **`config.json`** in the project root.
2. Replace **both** placeholders with **your** Solana wallet public key:
   - `YOUR_WALLET_PUBKEY_HERE` → your address (e.g. from Phantom or `solana address`)
   - `YOUR_TREASURY_WALLET_PUBKEY_HERE` → same or another wallet that should receive the 0.005 SOL per mint

---

## Step 3: Deploy the Candy Machine (the “mint contract”)

In a terminal, in the **project folder** (where `config.json` and `assets/` are):

```bash
sugar upload
```

When that finishes:

```bash
sugar deploy
```

At the end, Sugar prints the **Candy Machine ID** (a long base58 string). Copy it.

---

## Step 4: Connect the website to your Candy Machine

1. Open **`script.js`** in the project.
2. Find at the top:
   - `const CANDY_MACHINE_ID = '';`
3. Paste your Candy Machine ID between the quotes, e.g.:
   - `const CANDY_MACHINE_ID = 'AbC123...xyz';`
4. (Optional) Set `RPC_URL` to a better RPC if you have one (e.g. Helius, QuickNode).

---

## Step 5: Test minting

- **From the site:** Run a local server (`npx serve` or Live Server), open the site, connect Phantom, click MINT.  
  - If the button says “Mint not configured”, you didn’t set `CANDY_MACHINE_ID` in Step 4.
- **From the CLI:** In the project folder run `sugar mint` to mint one NFT to your wallet (good for testing).

---

## Step 6 (later): Enable “click to mint” in the browser

Right now the site knows your Candy Machine ID and can show a message; it does **not** yet build and send the mint transaction in the browser. To enable that you can:

- Use the [Metaplex JavaScript SDK](https://developers.metaplex.com/candy-machine/getting-started/js) to build the mint instruction and have Phantom sign it, or  
- Add a small backend that builds the mint transaction and returns it for the wallet to sign.

Details and links are in **MINT_SETUP.md**.

---

## After that: Upgrades

When a user “upgrades” their NFT:

- **Same NFT** – We only change its **metadata** (image + attributes). The mint address stays the same.
- **New image** – We point the NFT’s metadata to a new image (new URI).
- **Unique upgrade ID** – We store something like `upgrade_tier` and `upgrade_id` in the metadata so you can tell who upgraded and when.

Full design is in **UPGRADES.md**.

---

**Summary:**  
1) Install Solana + Sugar.  
2) Edit `config.json` with your wallet.  
3) Run `sugar upload` then `sugar deploy` and copy the Candy Machine ID.  
4) Put that ID in `script.js` as `CANDY_MACHINE_ID`.  
5) Test mint (site or `sugar mint`).  
6) Optionally add browser mint (see MINT_SETUP.md). Then use UPGRADES.md for the upgrade flow.
