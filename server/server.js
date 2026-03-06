/**
 * Divinity Upgrade API Server
 *
 * Handles upgrade tiers 1-3:
 *   Tier 1 ($5 USDC):  Random Angel or Demon
 *   Tier 2 ($10 USDC): User chooses Angel or Demon
 *   Tier 3 ($20 USDC): User chooses Angel or Demon
 *
 * Flow:
 *   1. Frontend sends USDC payment → gets tx signature
 *   2. Frontend calls POST /api/upgrade with { tier, nftMint, solanaWallet, choice?, txSignature }
 *   3. Server verifies USDC payment on-chain
 *   4. Server picks an Angel/Demon from the manifest (round-robin)
 *   5. Server builds new metadata JSON with full Arweave image URL
 *   6. Server uploads the new JSON to Irys
 *   7. Server updates the NFT's on-chain metadata URI via Metaplex
 *   8. Returns success + new image URI
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// ─── Config ───
const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'upgrades.json');
const MANIFEST_FILE = fs.existsSync(path.join(__dirname, 'upgrade_manifest.json'))
  ? path.join(__dirname, 'upgrade_manifest.json')
  : path.join(__dirname, '..', 'upgrade_manifest.json');
const BURNER_KEY_FILE = path.join(__dirname, '..', 'burner.json');

const RPC_URL = process.env.RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=f1722970-f727-465e-bbc2-5b4d2ba7884c';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDC_TREASURY = 'FTCQPhg846q25KuVkQa6Nyb2TYPJjdYayqWdSLBijPBX';
const USDC_DECIMALS = 6;
const CREATOR = 'FTCQPhg846q25KuVkQa6Nyb2TYPJjdYayqWdSLBijPBX';
const COLLECTION_MINT = 'CU9DXF5f9dJCUXV9oFwoFPoJVisH8H3tG49HyEkbEqs4';
const DESCRIPTION = 'Choose your side. Ascend or fall—the eternal war has only begun.';

const UPGRADE_PRICES = { 1: 5, 2: 10, 3: 20 };

app.use(cors());
app.use(express.json());

// ─── State ───
let manifest = null;
let upgradeCounters = { angel: 0, demon: 0 };
let irysInstance = null;
let umiInstance = null;

// ─── Helpers ───
function readUpgrades() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (_) { return []; }
}

function writeUpgrades(arr) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(arr, null, 2), 'utf8');
}

function loadManifest() {
  if (!fs.existsSync(MANIFEST_FILE)) {
    console.error('Missing upgrade_manifest.json! Run build-upgrade-manifest.js first.');
    return null;
  }
  return JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
}

function loadCounters() {
  // Count existing upgrades to continue round-robin from where we left off
  const upgrades = readUpgrades();
  let angelCount = 0, demonCount = 0;
  for (const u of upgrades) {
    if (u.assignedRealm === 'Angel') angelCount++;
    else if (u.assignedRealm === 'Demon') demonCount++;
  }
  upgradeCounters = { angel: angelCount, demon: demonCount };
  console.log(`Loaded counters: ${angelCount} Angel upgrades, ${demonCount} Demon upgrades`);
}

// ─── Load burner key from file or env var ───
function loadBurnerKey() {
  // Try env var first (for Railway / cloud deploy)
  if (process.env.BURNER_KEY) {
    return JSON.parse(process.env.BURNER_KEY);
  }
  // Fall back to file
  if (fs.existsSync(BURNER_KEY_FILE)) {
    return JSON.parse(fs.readFileSync(BURNER_KEY_FILE, 'utf8'));
  }
  throw new Error('No burner key found. Set BURNER_KEY env var or provide burner.json.');
}

// ─── Lazy init for Irys (uploads new metadata JSONs) ───
async function getIrys() {
  if (irysInstance) return irysInstance;
  const Irys = require('@irys/sdk');
  const keyData = loadBurnerKey();
  irysInstance = new Irys({
    url: 'https://node1.irys.xyz',
    token: 'solana',
    key: new Uint8Array(keyData),
    config: { providerUrl: RPC_URL }
  });
  const bal = await irysInstance.getLoadedBalance();
  console.log(`Irys balance: ${irysInstance.utils.fromAtomic(bal)} SOL`);
  return irysInstance;
}

// ─── Lazy init for Umi (updates NFT metadata on-chain) ───
async function getUmi() {
  if (umiInstance) return umiInstance;
  const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
  const { mplTokenMetadata } = require('@metaplex-foundation/mpl-token-metadata');
  const { keypairIdentity } = require('@metaplex-foundation/umi');

  const umi = createUmi(RPC_URL).use(mplTokenMetadata());
  const keyData = loadBurnerKey();
  const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(keyData));
  umi.use(keypairIdentity(keypair));

  umiInstance = umi;
  console.log('Umi initialized for metadata updates');
  return umi;
}

// ─── Verify USDC payment on-chain ───
async function verifyUsdcPayment(txSignature, expectedAmountUsd) {
  const { Connection } = require('@solana/web3.js');
  const conn = new Connection(RPC_URL);

  const tx = await conn.getTransaction(txSignature, {
    commitment: 'confirmed',
    maxSupportedTransactionVersion: 0
  });

  if (!tx) throw new Error('Transaction not found. It may still be confirming.');
  if (tx.meta?.err) throw new Error('Transaction failed on-chain.');

  // Check for USDC transfer to treasury in the token balances
  const preBalances = tx.meta?.preTokenBalances || [];
  const postBalances = tx.meta?.postTokenBalances || [];

  // Find treasury's USDC post-balance change
  let treasuryReceived = 0;
  for (const post of postBalances) {
    if (post.mint === USDC_MINT && post.owner === USDC_TREASURY) {
      const pre = preBalances.find(p => p.accountIndex === post.accountIndex);
      const preAmount = pre ? parseInt(pre.uiTokenAmount?.amount || '0') : 0;
      const postAmount = parseInt(post.uiTokenAmount?.amount || '0');
      treasuryReceived = (postAmount - preAmount) / Math.pow(10, USDC_DECIMALS);
    }
  }

  if (treasuryReceived < expectedAmountUsd) {
    throw new Error(`Payment too low. Expected $${expectedAmountUsd}, got $${treasuryReceived.toFixed(2)}.`);
  }

  return true;
}

// ─── Pick an Angel or Demon from the manifest ───
function pickNft(realm) {
  const pool = realm === 'Angel' ? manifest.angels : manifest.demons;
  const counter = realm === 'Angel' ? 'angel' : 'demon';
  const index = upgradeCounters[counter] % pool.length;
  upgradeCounters[counter]++;
  return pool[index];
}

// ─── Build + upload new metadata JSON with full image URL ───
async function uploadNewMetadata(nftEntry, realm, tier) {
  const irys = await getIrys();

  const newMeta = {
    name: `Divinity — ${realm}`,
    symbol: 'DIV',
    description: DESCRIPTION,
    image: nftEntry.imageUri,
    attributes: [
      { trait_type: 'Realm', value: realm },
      { trait_type: 'Collection', value: 'Divinity' },
      { trait_type: 'upgrade_tier', value: String(tier) }
    ],
    properties: {
      files: [{ uri: nftEntry.imageUri, type: 'image/png' }],
      category: 'image',
      creators: [{ address: CREATOR, share: 100 }]
    }
  };

  const buffer = Buffer.from(JSON.stringify(newMeta));
  const receipt = await irys.upload(buffer, {
    tags: [
      { name: 'Content-Type', value: 'application/json' },
      { name: 'App-Name', value: 'Divinity-NFT' }
    ]
  });

  return `https://gateway.irys.xyz/${receipt.id}`;
}

// ─── Update NFT metadata on-chain ───
async function updateNftMetadata(nftMintAddress, newUri) {
  const umi = await getUmi();
  const { publicKey, some } = require('@metaplex-foundation/umi');
  const { updateV1, fetchMetadataFromSeeds } = require('@metaplex-foundation/mpl-token-metadata');

  const mint = publicKey(nftMintAddress);

  // Fetch existing metadata
  const metadata = await fetchMetadataFromSeeds(umi, { mint });

  // Update only the URI
  await updateV1(umi, {
    mint,
    authority: umi.identity,
    data: {
      ...metadata,
      uri: newUri
    }
  }).sendAndConfirm(umi);

  return true;
}

// ─── API Routes ───
app.post('/api/upgrade', async (req, res) => {
  try {
    const { tier, solanaWallet, nftMint, choice, txSignature } = req.body || {};
    const t = Number(tier);

    // Validate input
    if (![1, 2, 3].includes(t) || !solanaWallet || !nftMint) {
      return res.status(400).json({ error: 'Missing or invalid tier, solanaWallet, or nftMint.' });
    }
    if ((t === 2 || t === 3) && !choice) {
      return res.status(400).json({ error: 'Tier 2 and 3 require choice (angel or demon).' });
    }
    if (!txSignature) {
      return res.status(400).json({ error: 'Missing txSignature. Pay USDC first.' });
    }
    if (!manifest) {
      return res.status(500).json({ error: 'Server not ready. Manifest not loaded.' });
    }

    // Check for duplicate tx
    const existing = readUpgrades();
    if (existing.some(u => u.txSignature === txSignature)) {
      return res.status(400).json({ error: 'This transaction has already been used for an upgrade.' });
    }

    // 1. Verify USDC payment
    const expectedAmount = UPGRADE_PRICES[t];
    console.log(`Verifying USDC payment of $${expectedAmount} (tx: ${txSignature.slice(0, 10)}...)`);
    await verifyUsdcPayment(txSignature, expectedAmount);

    // 2. Determine realm
    let realm;
    if (t === 1) {
      // Random angel or demon
      realm = Math.random() < 0.5 ? 'Angel' : 'Demon';
    } else {
      realm = String(choice).toLowerCase() === 'angel' ? 'Angel' : 'Demon';
    }

    // 3. Pick an NFT from the manifest (round-robin)
    const nftEntry = pickNft(realm);
    console.log(`Picked ${realm} #${nftEntry.index} for ${solanaWallet.slice(0, 8)}...`);

    // 4. Upload new metadata JSON with full image URL
    console.log('Uploading new metadata JSON to Irys...');
    const newMetadataUri = await uploadNewMetadata(nftEntry, realm, t);
    console.log(`New metadata: ${newMetadataUri}`);

    // 5. Update NFT on-chain
    console.log(`Updating NFT ${nftMint.slice(0, 8)}... metadata on-chain...`);
    await updateNftMetadata(nftMint, newMetadataUri);
    console.log('NFT metadata updated successfully!');

    // 6. Record the upgrade
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      tier: t,
      solanaWallet: String(solanaWallet),
      nftMint: String(nftMint),
      choice: t >= 2 ? String(choice).toLowerCase() : null,
      assignedRealm: realm,
      assignedIndex: nftEntry.index,
      newMetadataUri,
      newImageUri: nftEntry.imageUri,
      txSignature: String(txSignature),
      createdAt: new Date().toISOString()
    };
    existing.push(entry);
    writeUpgrades(existing);

    res.status(201).json({
      ok: true,
      id: entry.id,
      realm,
      imageUri: nftEntry.imageUri,
      metadataUri: newMetadataUri,
      message: `Your NFT has been upgraded to ${realm}! Check your wallet.`
    });

  } catch (err) {
    console.error('Upgrade error:', err);
    res.status(500).json({ error: err.message || 'Upgrade failed.' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    manifestLoaded: !!manifest,
    angels: manifest?.totalAngels || 0,
    demons: manifest?.totalDemons || 0,
    counters: upgradeCounters
  });
});

// ─── Startup ───
manifest = loadManifest();
if (manifest) {
  console.log(`Manifest loaded: ${manifest.totalAngels} Angels, ${manifest.totalDemons} Demons`);
  loadCounters();
} else {
  console.warn('No manifest loaded. Upgrades will fail until upgrade_manifest.json exists.');
}

app.listen(PORT, () => {
  console.log(`Divinity upgrade API on http://localhost:${PORT}`);
});
