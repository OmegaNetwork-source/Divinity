# Upload and deploy – step by step

You’ll run two commands in the terminal. The first uploads your images and metadata; the second creates the Candy Machine on devnet.

---

## Before you start

You need a **keypair file** for your burner wallet (the one with address `FTCQPhg846q25KuVkQa6Nyb2TYPJjdYayqWdSLBijPBX`).

- **If you already have a .json keypair file** for that wallet → note its full path (e.g. `C:\Users\richa\Desktop\burner.json`).
- **If the wallet is in Phantom** → you have to export the private key and turn it into a Solana keypair JSON. One way:
  1. In Phantom: Settings → Security → Export Private Key (for the burner).
  2. You get a long string (base58). Use a converter or a small script to turn it into a JSON array of 64 numbers. Save that as a file, e.g. `burner.json`, and use that path below.

---

## Step 1: Open PowerShell in the project folder

1. Press **Windows key**, type **PowerShell**, open **Windows PowerShell**.
2. Run:

   ```powershell
   cd "c:\Users\richa\Desktop\Desktop\Divinity"
   ```

   You should see the prompt change to something like `PS C:\Users\richa\Desktop\Desktop\Divinity>`.

---

## Step 2: Run upload (sends your NFT files to storage)

This command reads your `assets` folder and `config.json`, then uploads the images and metadata to Bundlr (paid with a little SOL from your burner).

**Replace `C:\path\to\burner.json` with the real path to your burner keypair file.**

```powershell
sugar upload -k "C:\path\to\burner.json" -r https://api.devnet.solana.com
```

Example if the file is on your Desktop:

```powershell
sugar upload -k "C:\Users\richa\Desktop\burner.json" -r https://api.devnet.solana.com
```

- It may ask you to confirm or show progress; wait until it says it’s done.
- If you get “insufficient funds” or similar, your burner needs more devnet SOL (use the faucet again).

---

## Step 3: Run deploy (creates the Candy Machine on Solana)

After upload finishes, run the same thing but with **deploy** instead of **upload**:

```powershell
sugar deploy -k "C:\path\to\burner.json" -r https://api.devnet.solana.com
```

Again use your real keypair path (e.g. `C:\Users\richa\Desktop\burner.json`).

- At the end, Sugar prints a line with the **Candy Machine ID** (a long base58 string).
- **Copy that ID** and keep it somewhere.

---

## Step 4: Put the Candy Machine ID in the website

1. Open the project in your editor and open **script.js**.
2. Find the line: `const CANDY_MACHINE_ID = '';`
3. Paste the ID you copied between the quotes:

   ```js
   const CANDY_MACHINE_ID = 'AbC123...yourActualId...xyz';
   ```

4. Save the file.

---

## Quick recap

| Step | What you do |
|------|------------------|
| 1 | `cd` to the Divinity folder in PowerShell |
| 2 | `sugar upload -k "path\to\burner.json" -r https://api.devnet.solana.com` |
| 3 | `sugar deploy -k "path\to\burner.json" -r https://api.devnet.solana.com` → copy the Candy Machine ID |
| 4 | In script.js set `CANDY_MACHINE_ID = 'pastetheid'` and save |

After that you can test a mint with:  
`sugar mint -k "path\to\burner.json" -r https://api.devnet.solana.com`
