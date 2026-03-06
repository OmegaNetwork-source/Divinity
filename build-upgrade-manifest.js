/**
 * Build upgrade_manifest.json from the raw Irys manifest.
 * Uses direct Arweave IDs (not manifest path URLs) for reliability.
 *
 * The JSON metadata files on Arweave still reference relative image paths
 * (e.g. "0.png"), so for upgrades the server needs to update the NFT URI
 * to the metadata JSON's direct ID. Wallets will then resolve the image
 * via the manifest or we can point directly.
 *
 * Run: node build-upgrade-manifest.js
 */

const fs = require("fs");
const path = require("path");

const MANIFEST_RAW = path.join(__dirname, "manifest_raw.json");
const ASSETS_DIR = path.join(__dirname, "assets_nft");
const OUTPUT = path.join(__dirname, "upgrade_manifest.json");
const GATEWAY = "https://gateway.irys.xyz";
const MANIFEST_ID = "_wncIPCyGtcTjBLkWBk5eTQMws_FX4m2teSElJ3TPaE";

function main() {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_RAW, "utf8"));
    const paths = manifest.paths;

    const angels = [];
    const demons = [];

    for (let i = 0; i < 5000; i++) {
        // Find image extension
        let imgKey = null;
        for (const ext of [".png", ".jpg", ".jpeg", ".gif"]) {
            if (paths[`${i}${ext}`]) { imgKey = `${i}${ext}`; break; }
        }
        const jsonKey = `${i}.json`;

        if (!paths[jsonKey]) {
            console.warn(`Missing JSON for index ${i}`);
            continue;
        }

        const imageId = imgKey ? paths[imgKey].id : null;
        const metadataId = paths[jsonKey].id;

        const entry = {
            index: i,
            imageUri: imageId ? `${GATEWAY}/${imageId}` : null,
            metadataUri: `${GATEWAY}/${metadataId}`,
            // Also include manifest-style path for future use
            manifestImageUri: imgKey ? `${GATEWAY}/${MANIFEST_ID}/${imgKey}` : null,
            manifestMetadataUri: `${GATEWAY}/${MANIFEST_ID}/${jsonKey}`
        };

        if (i < 2500) {
            angels.push(entry);
        } else {
            demons.push(entry);
        }
    }

    const result = {
        manifestId: MANIFEST_ID,
        gateway: GATEWAY,
        totalAngels: angels.length,
        totalDemons: demons.length,
        angels,
        demons
    };

    fs.writeFileSync(OUTPUT, JSON.stringify(result, null, 2));
    console.log(`Wrote ${OUTPUT}`);
    console.log(`  Angels: ${angels.length}`);
    console.log(`  Demons: ${demons.length}`);
    console.log(`  Sample Angel metadata (direct): ${angels[0].metadataUri}`);
    console.log(`  Sample Angel image (direct):    ${angels[0].imageUri}`);
    console.log(`  Sample Demon metadata (direct): ${demons[0].metadataUri}`);
    console.log(`  Sample Demon image (direct):    ${demons[0].imageUri}`);
}

main();
