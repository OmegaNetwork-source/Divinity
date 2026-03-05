# NFT upgrades – replace image + unique upgrade ID

Users keep the **same NFT** (same mint). When they upgrade, we **replace the image** (and other metadata) and store a **unique upgrade ID** so you can tell who has upgraded.

---

## How it works

1. **Same NFT**  
   We do **not** mint a new token. We update the **existing** NFT’s Metaplex metadata (URI, name, attributes).

2. **New image**  
   - You host a new image (e.g. “upgraded” version of the art).  
   - You create a new metadata JSON that points to that image and includes upgrade info.  
   - We call Metaplex’s **update** instruction to set the NFT’s `uri` (and optionally `name`) to that new JSON.  
   - Wallets and marketplaces will then show the **new image** for that NFT.

3. **Unique ID for “has upgraded”**  
   We store it **in the NFT metadata** so the NFT itself is the proof:
   - **`upgrade_tier`** – e.g. `0` = base, `1` = first upgrade, `2` = second, etc.  
   - **`upgrade_id`** – a unique string per upgrade (e.g. `mint_pubkey + "_" + timestamp` or a UUID) so you can tell exactly which upgrade happened and when.

   You can also keep a separate list (e.g. database or on-chain PDA) keyed by mint or upgrade_id if you need to query “all upgraded mints” off-chain.

---

## Metadata shape (before vs after upgrade)

**Before (base mint):**
```json
{
  "name": "Divinity #1",
  "symbol": "DIV",
  "description": "...",
  "image": "https://.../0.jpg",
  "attributes": [
    { "trait_type": "Realm", "value": "Eternal Conflict" },
    { "trait_type": "Collection", "value": "Divinity" },
    { "trait_type": "upgrade_tier", "value": "0" }
  ]
}
```

**After upgrade (same mint, new image + ID):**
```json
{
  "name": "Divinity #1 (Upgraded)",
  "symbol": "DIV",
  "description": "...",
  "image": "https://.../upgraded-1.jpg",
  "attributes": [
    { "trait_type": "Realm", "value": "Eternal Conflict" },
    { "trait_type": "Collection", "value": "Divinity" },
    { "trait_type": "upgrade_tier", "value": "1" },
    { "trait_type": "upgrade_id", "value": "abc123...xyz" }
  ]
}
```

- **`upgrade_tier`** – You can use this for perks (e.g. tier 1+ gets X).  
- **`upgrade_id`** – Unique per upgrade; good for analytics, support, or on-chain/off-chain lookups.

---

## Who can update the NFT?

- Only the **update authority** of the NFT can change its metadata.  
- For Candy Machine mints, the **Candy Machine / collection update authority** is usually **you** (the wallet you used in `config.json`).  
- So: **your backend or your signed flow** should run the Metaplex **update** instruction; the user just signs a payment or approval if you charge for upgrades.

---

## Implementation options

**Option A – Backend (recommended)**  
1. User connects wallet on the site and clicks “Upgrade” for a chosen Divinity NFT.  
2. Your server checks they own it (and any payment / eligibility).  
3. Server uploads new image + new metadata JSON (with new `image`, `upgrade_tier`, `upgrade_id`).  
4. Server builds the Metaplex **update** transaction (update metadata URI/name) and optionally has the user sign (e.g. for payment).  
5. Server signs with the **update authority** key and submits the transaction.  
6. After confirm, the same NFT shows the new image and new attributes; you can use `upgrade_id` and `upgrade_tier` everywhere.

**Option B – Frontend-only (no backend)**  
- The **update authority** private key must stay secret, so it cannot live in the browser.  
- So “upgrade” that actually changes the NFT **must** go through something you control (backend or a secure signer).  
- The frontend can: detect the user’s Divinity NFTs, show “Upgrade” and send a request to your backend (Option A).

---

## What you need to build

1. **Upgrades page/section** – User connects wallet; you list their Divinity NFTs (by collection) and show an “Upgrade” button per NFT (or one “Upgrade” for the first eligible one).  
2. **Backend (or script) that:**  
   - Verifies ownership and any payment.  
   - Uploads new image + metadata (with `upgrade_tier` and `upgrade_id`).  
   - Builds and sends Metaplex **update** with your update authority.  
3. **Upgrade images** – Art for each tier (e.g. `upgraded-1.jpg`, `upgraded-2.jpg`) and a simple rule (e.g. tier 0 → tier 1 image, tier 1 → tier 2 image).

---

## Summary

- **Replace image:** Update the NFT’s metadata URI to a new JSON that points to the new image.  
- **Same NFT:** No new mint; same token, new metadata.  
- **Unique ID:** Use `upgrade_tier` + `upgrade_id` in the metadata so you (and any tooling) can tell who upgraded and when.  
- **Who does the update:** Only the update authority (you), so upgrades go through your backend or a secure script, not the browser alone.

Next: implement the Upgrades UI (connect wallet, list NFTs, “Upgrade” button) and a small backend that performs the metadata update and sets `upgrade_tier` and `upgrade_id`.
