/**
 * Build Sugar Candy Machine assets from assets/Angels and assets/Demons.
 * Output: assets_nft/ with 0.png, 0.json ... (N-1).png, (N-1).json
 * - All Angels first (indices 0 to countAngels-1), Realm: Angel
 * - All Demons next (indices countAngels to total-1), Realm: Demon
 * Target: ~10k Angels + ~10k Demons = ~20k total. Uses whatever count is in each folder.
 *
 * Run: node build-nft-assets.js
 * Then copy contents of assets_nft into assets (backup current assets first), set config.json number to printed total and remove hiddenSettings, then sugar upload / sugar deploy (see MAINNET_NFT_GUIDE.md).
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname);
const ANGELS_IMAGES = path.join(PROJECT_ROOT, 'assets', 'Angels', 'Angels', 'images');
const DEMONS_IMAGES = path.join(PROJECT_ROOT, 'assets', 'Demons', 'Demons', 'images');
const OUT_DIR = path.join(PROJECT_ROOT, 'assets_nft');

const CREATOR = 'FTCQPhg846q25KuVkQa6Nyb2TYPJjdYayqWdSLBijPBX';
const DESCRIPTION = 'Choose your side. Ascend or fall—the eternal war has only begun.';

function getSortedImagePaths(dir) {
  if (!fs.existsSync(dir)) {
    console.error('Missing folder:', dir);
    return [];
  }
  const files = fs.readdirSync(dir)
    .filter(f => /\.(png|jpg|jpeg|gif)$/i.test(f))
    .map(f => ({ name: f, num: parseInt(f.replace(/\D/g, ''), 10) || 0 }))
    .filter(x => !isNaN(x.num))
    .sort((a, b) => a.num - b.num);
  return files.map(f => path.join(dir, f.name));
}

function metadata(index, imageFile, realm) {
  const name = `Divinity #${index + 1}`;
  const ext = path.extname(imageFile).toLowerCase();
  const imageName = `${index}${ext}`;
  const mime = ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : 'image/jpeg';
  return {
    name,
    symbol: 'DIV',
    description: DESCRIPTION,
    image: imageName,
    attributes: [
      { trait_type: 'Realm', value: realm },
      { trait_type: 'Collection', value: 'Divinity' },
      { trait_type: 'upgrade_tier', value: '0' }
    ],
    properties: {
      files: [{ uri: imageName, type: mime }],
      category: 'image',
      creators: [{ address: CREATOR, share: 100 }]
    }
  };
}

function main() {
  const angelPaths = getSortedImagePaths(ANGELS_IMAGES);
  const demonPaths = getSortedImagePaths(DEMONS_IMAGES);

  console.log('Angels images:', angelPaths.length);
  console.log('Demons images:', demonPaths.length);

  if (angelPaths.length === 0 || demonPaths.length === 0) {
    console.error('Need images in both assets/Angels/Angels/images and assets/Demons/Demons/images');
    process.exit(1);
  }

  const total = angelPaths.length + demonPaths.length;
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  let index = 0;
  for (const imgPath of angelPaths) {
    const ext = path.extname(imgPath);
    const destName = `${index}${ext}`;
    const destPath = path.join(OUT_DIR, destName);
    fs.copyFileSync(imgPath, destPath);
    const meta = metadata(index, destName, 'Angel');
    fs.writeFileSync(path.join(OUT_DIR, `${index}.json`), JSON.stringify(meta, null, 2));
    index++;
  }
  for (const imgPath of demonPaths) {
    const ext = path.extname(imgPath);
    const destName = `${index}${ext}`;
    const destPath = path.join(OUT_DIR, destName);
    fs.copyFileSync(imgPath, destPath);
    const meta = metadata(index, destName, 'Demon');
    fs.writeFileSync(path.join(OUT_DIR, `${index}.json`), JSON.stringify(meta, null, 2));
    index++;
  }

  console.log('Wrote', index, 'assets to', OUT_DIR);
  console.log('Set config.json "number" to', index, 'and remove "hiddenSettings". Then see MAINNET_NFT_GUIDE.md.');
}

main();
