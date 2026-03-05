# Test the first mint – quick checklist

Do these in order. At the end you’ll have minted one Divinity NFT (e.g. to your Phantom wallet).

---

## 1. Install tools (one-time)

**Solana CLI**  
- Windows (PowerShell): `cmd /c "curl https://release.solana.com/stable/solana-install-init-x86_64-pc-windows-msvc.exe -o solana-install.exe && solana-install.exe"`  
- Or: https://docs.solana.com/cli/install-solana-cli-tools  

Then:
```bash
solana config set --url devnet
```
(Use devnet so you don’t spend real SOL. Use `mainnet-beta` when you’re ready for production.)

**Sugar CLI**  
- https://developers.metaplex.com/smart-contracts/candy-machine/sugar/installation  

Check both:
```bash
solana --version
sugar --version
```

---

## 2. Wallet and SOL

Your Phantom wallet (or the keypair Sugar uses) needs to pay for upload + deploy + mint.

**Option A – Use Phantom as the deployer**  
- Export your Phantom keypair (Phantom → Settings → Security → Export Private Key) and save it as a JSON file.  
- Point Sugar to it: `sugar upload -k path/to/your-keypair.json` (and same for deploy/mint).

**Option B – Use Solana CLI keypair**  
- Create one: `solana keypair new`  
- Get devnet SOL: `solana airdrop 2`  
- Get your address: `solana address` (you’ll use this in Step 3)

---

## 3. Edit config.json

Open **`config.json`** in the Divinity project folder.

Replace:
- **`YOUR_WALLET_PUBKEY_HERE`** → your Solana address (from Phantom or `solana address`)
- **`YOUR_TREASURY_WALLET_PUBKEY_HERE`** → same address (or another wallet that should receive the 0.005 SOL per mint)

Save the file.

---

## 4. Upload and deploy

Open a terminal in the **project folder** (where `config.json` and `assets/` are).

**Upload assets (images + metadata):**
```bash
sugar upload
```
If Sugar asks for keypair or RPC, use the same wallet and devnet.

**Deploy the Candy Machine:**
```bash
sugar deploy
```

When it finishes, it prints the **Candy Machine ID** (long base58 string). **Copy it** and keep it somewhere (you’ll use it for the website).

---

## 5. Mint one NFT (test)

Still in the project folder:

```bash
sugar mint
```

Sugar will mint one NFT from your Candy Machine to the wallet it’s using (or prompt you to pick a wallet). Check that wallet in Phantom (or Solana Explorer) – you should see the Divinity NFT.

---

## 6. (Optional) Connect the website

1. Open **`script.js`** in the project.
2. Set: `const CANDY_MACHINE_ID = 'YOUR_COPIED_CANDY_MACHINE_ID';`
3. Set RPC if you want: `const RPC_URL = 'https://api.devnet.solana.com';` (for devnet).
4. Run a local server (e.g. `npx serve`), open the site, connect Phantom.

Note: The site doesn’t yet build the mint transaction in the browser, so “MINT” will show a message or you’ll use `sugar mint` for testing. Adding full “click to mint” is Step 6 in **NEXT_STEPS.md**.

---

**Summary:** Install Solana + Sugar → edit config.json with your wallet → `sugar upload` → `sugar deploy` → copy Candy Machine ID → `sugar mint` to test. Then optionally set `CANDY_MACHINE_ID` in script.js for the site.
