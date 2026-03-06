/**
 * Bulk-upload Angel & Demon NFT images + metadata to Irys (Arweave).
 *
 * Reads images from assets_nft/, uploads each image, builds the final
 * metadata JSON (with permanent image URL), uploads metadata, then saves
 * a manifest file: upgrade_manifest.json
 *
 * Manifest shape:
 *   { angels: [ { index, imageUri, metadataUri } ], demons: [ ... ] }
 *
 * The server uses the manifest to pick an unused Angel or Demon URI
 * when a user pays for an upgrade.
 *
 * Usage:  node bulk-upload-irys.js
 *
 * Resume: The script saves progress to upload_progress.json after every
 *         successful upload. If interrupted, re-run and it will skip
 *         already-uploaded items.
 */

const Irys = require("@irys/sdk");
const fs = require("fs");
const path = require("path");

// ─── Config ───
const ASSETS_DIR = path.join(__dirname, "assets_nft");
const BURNER_KEY = path.join(__dirname, "burner.json");
const RPC_URL = "https://mainnet.helius-rpc.com/?api-key=f1722970-f727-465e-bbc2-5b4d2ba7884c";
const PROGRESS_FILE = path.join(__dirname, "upload_progress.json");
const MANIFEST_FILE = path.join(__dirname, "upgrade_manifest.json");

const CREATOR = "FTCQPhg846q25KuVkQa6Nyb2TYPJjdYayqWdSLBijPBX";
const DESCRIPTION = "Choose your side. Ascend or fall—the eternal war has only begun.";

// How many items to upload before writing a progress checkpoint
const CHECKPOINT_EVERY = 5;
// Delay between uploads to avoid rate-limiting (ms)
const DELAY_MS = 250;

// ─── Helpers ───
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function loadProgress() {
    try { return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf8")); }
    catch { return {}; }
}
function saveProgress(prog) {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(prog, null, 2));
}

function getExt(filename) { return path.extname(filename).toLowerCase(); }
function getMime(ext) {
    if (ext === ".png") return "image/png";
    if (ext === ".gif") return "image/gif";
    return "image/jpeg";
}

// ─── Main ───
async function main() {
    // Load burner keypair
    const keyData = JSON.parse(fs.readFileSync(BURNER_KEY, "utf8"));

    // Initialize Irys
    console.log("Connecting to Irys...");
    const irys = new Irys({
        url: "https://node1.irys.xyz",
        token: "solana",
        key: new Uint8Array(keyData),
        config: { providerUrl: RPC_URL }
    });

    // Check + fund balance — need enough for ~5000 images (~1MB each) + 5000 JSONs
    // Irys pricing is roughly ~0.00005 SOL per 100KB, so ~5GB ≈ 0.25+ SOL
    const bal = await irys.getLoadedBalance();
    const balSol = parseFloat(irys.utils.fromAtomic(bal));
    console.log(`Irys balance: ${balSol} SOL`);

    const MIN_IRYS_BALANCE = 0.1;
    if (balSol < MIN_IRYS_BALANCE) {
        const fundAmount = 0.2;
        console.log(`Irys balance too low. Funding with ${fundAmount} SOL...`);
        await irys.fund(irys.utils.toAtomic(fundAmount));
        const newBal = await irys.getLoadedBalance();
        console.log(`New Irys balance: ${irys.utils.fromAtomic(newBal)} SOL`);
    }

    // Enumerate all image files in assets_nft
    const allFiles = fs.readdirSync(ASSETS_DIR).filter(f => /\.(png|jpg|jpeg|gif)$/i.test(f));
    const sorted = allFiles.sort((a, b) => {
        const na = parseInt(a.replace(/\D/g, ""), 10);
        const nb = parseInt(b.replace(/\D/g, ""), 10);
        return na - nb;
    });

    console.log(`Found ${sorted.length} images in assets_nft/`);

    // Load the JSON for each to determine realm
    // build-nft-assets.js wrote 0..2499 as Angel, 2500..4999 as Demon
    const progress = loadProgress();
    let uploaded = 0;
    let skipped = 0;

    for (const imgFile of sorted) {
        const idx = parseInt(imgFile.replace(/\D/g, ""), 10);
        const key = String(idx);

        // Skip if already uploaded
        if (progress[key] && progress[key].metadataUri) {
            skipped++;
            continue;
        }

        const ext = getExt(imgFile);
        const mime = getMime(ext);
        const imgPath = path.join(ASSETS_DIR, imgFile);
        const jsonPath = path.join(ASSETS_DIR, `${idx}.json`);

        if (!fs.existsSync(jsonPath)) {
            console.warn(`  ⚠ No JSON for index ${idx}, skipping`);
            continue;
        }

        const meta = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
        const realm = (meta.attributes || []).find(a => a.trait_type === "Realm")?.value || "Unknown";

        // 1. Upload image
        console.log(`[${idx}/${sorted.length - 1}] Uploading image (${realm})...`);
        const imgData = fs.readFileSync(imgPath);

        let imageUri;
        try {
            const imgReceipt = await irys.upload(imgData, {
                tags: [
                    { name: "Content-Type", value: mime },
                    { name: "App-Name", value: "Divinity-NFT" }
                ]
            });
            imageUri = `https://gateway.irys.xyz/${imgReceipt.id}`;
        } catch (err) {
            // If insufficient funds (402 or "not enough balance"), try to fund
            if (/insufficient|402|not enough balance/i.test(err.message)) {
                console.log("  Funding Irys with 0.1 SOL...");
                await irys.fund(irys.utils.toAtomic(0.1));
                const imgReceipt = await irys.upload(imgData, {
                    tags: [{ name: "Content-Type", value: mime }, { name: "App-Name", value: "Divinity-NFT" }]
                });
                imageUri = `https://gateway.irys.xyz/${imgReceipt.id}`;
            } else {
                console.error(`  ✗ Image upload failed for ${idx}:`, err.message);
                continue;
            }
        }

        // 2. Build final metadata JSON with permanent image URL
        const finalMeta = {
            name: meta.name,
            symbol: meta.symbol || "DIV",
            description: meta.description || DESCRIPTION,
            image: imageUri,
            attributes: meta.attributes || [],
            properties: {
                files: [{ uri: imageUri, type: mime }],
                category: "image",
                creators: [{ address: CREATOR, share: 100 }]
            }
        };

        // 3. Upload metadata JSON
        const metaBuffer = Buffer.from(JSON.stringify(finalMeta));
        let metadataUri;
        try {
            const metaReceipt = await irys.upload(metaBuffer, {
                tags: [
                    { name: "Content-Type", value: "application/json" },
                    { name: "App-Name", value: "Divinity-NFT" }
                ]
            });
            metadataUri = `https://gateway.irys.xyz/${metaReceipt.id}`;
        } catch (err) {
            if (/insufficient|402|not enough balance/i.test(err.message)) {
                console.log("  Funding Irys with 0.1 SOL...");
                await irys.fund(irys.utils.toAtomic(0.1));
                const metaReceipt = await irys.upload(metaBuffer, {
                    tags: [{ name: "Content-Type", value: "application/json" }, { name: "App-Name", value: "Divinity-NFT" }]
                });
                metadataUri = `https://gateway.irys.xyz/${metaReceipt.id}`;
            } else {
                console.error(`  ✗ Metadata upload failed for ${idx}:`, err.message);
                continue;
            }
        }

        console.log(`  ✓ ${realm} #${idx} → ${metadataUri}`);

        // Save progress
        progress[key] = { index: idx, realm, imageUri, metadataUri };
        uploaded++;

        if (uploaded % CHECKPOINT_EVERY === 0) {
            saveProgress(progress);
            console.log(`  [checkpoint] ${uploaded} uploaded, ${skipped} skipped`);
        }

        await sleep(DELAY_MS);
    }

    // Final save
    saveProgress(progress);

    // Build manifest
    const angels = [];
    const demons = [];
    for (const [, entry] of Object.entries(progress)) {
        if (!entry.metadataUri) continue;
        const item = { index: entry.index, imageUri: entry.imageUri, metadataUri: entry.metadataUri };
        if (entry.realm === "Angel") angels.push(item);
        else if (entry.realm === "Demon") demons.push(item);
    }
    angels.sort((a, b) => a.index - b.index);
    demons.sort((a, b) => a.index - b.index);

    const manifest = { angels, demons, totalAngels: angels.length, totalDemons: demons.length };
    fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));

    console.log("\n════════════════════════════════════════");
    console.log(`Done! Uploaded ${uploaded} new, skipped ${skipped} existing.`);
    console.log(`Angels: ${angels.length}, Demons: ${demons.length}`);
    console.log(`Manifest saved to: ${MANIFEST_FILE}`);
    console.log("════════════════════════════════════════");
}

main().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
