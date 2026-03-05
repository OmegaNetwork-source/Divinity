# What’s already done for you

- **Sugar CLI** – Installed (Windows binary) and on your PATH. Run `sugar --version` to confirm.
- **Solana CLI** – Already working; config set to **devnet**.
- **Keypair** – Created at `C:\Users\richa\.config\solana\id.json`  
  - **Address:** `HsmoXF1ppDVRqgfuxhrNX5EM9BySUdJSwjkGmnRUw3Pu`  
  - **Back up the seed phrase** you saw when it was created (or export the keypair from Phantom and use that path with `-k` if you prefer).
- **config.json** – Updated with that address for both creator and treasury.  
  - Added `"ruleSet": null` so Sugar 2.x accepts the config.

---

# What you need to do (3 steps)

## 1. Get devnet SOL

Your wallet has no SOL yet (devnet airdrop was rate-limited).

- Open **https://faucet.solana.com**
- Choose **Devnet**
- Paste: `HsmoXF1ppDVRqgfuxhrNX5EM9BySUdJSwjkGmnRUw3Pu`
- Request 1–2 SOL

Or in a terminal (after a few minutes):  
`solana airdrop 2`

## 2. Upload and deploy the Candy Machine

In PowerShell, in the **Divinity project folder**:

```powershell
cd "c:\Users\richa\Desktop\Desktop\Divinity"
sugar upload -k "$env:USERPROFILE\.config\solana\id.json" -r https://api.devnet.solana.com
```

When that finishes:

```powershell
sugar deploy -k "$env:USERPROFILE\.config\solana\id.json" -r https://api.devnet.solana.com
```

At the end, Sugar prints the **Candy Machine ID**. Copy it.

## 3. Put the Candy Machine ID in the website

Open **script.js** and set:

```js
const CANDY_MACHINE_ID = 'PASTE_THE_ID_HERE';
```

Save. Then run `sugar mint` in the project folder to test a mint, or run the site and connect Phantom (browser mint will show a message until you add the mint flow; CLI mint works now).

---

**Summary:** Get devnet SOL → `sugar upload` → `sugar deploy` → copy Candy Machine ID into `script.js` → test with `sugar mint`.
