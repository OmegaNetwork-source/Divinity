/**
 * Divinity upgrade API
 * - POST /api/upgrade — submit upgrade (tier 1–3, solanaWallet, nftMint; tier 2/3 require choice: angel|demon)
 * Store: upgrades.json (you can manually check who did tier 3 / paid $20)
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'upgrades.json');

app.use(cors());
app.use(express.json());

function readUpgrades() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

function writeUpgrades(arr) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(arr, null, 2), 'utf8');
}

app.post('/api/upgrade', (req, res) => {
  const { tier, solanaWallet, nftMint, choice } = req.body || {};
  const t = Number(tier);
  if (![1, 2, 3].includes(t) || !solanaWallet || !nftMint) {
    return res.status(400).json({ error: 'Missing or invalid tier, solanaWallet, or nftMint.' });
  }
  if ((t === 2 || t === 3) && !choice) {
    return res.status(400).json({ error: 'Tier 2 and 3 require choice (angel or demon).' });
  }

  const upgrades = readUpgrades();
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    tier: t,
    solanaWallet: String(solanaWallet),
    nftMint: String(nftMint),
    choice: t >= 2 ? String(choice).toLowerCase() : null,
    createdAt: new Date().toISOString()
  };
  upgrades.push(entry);
  writeUpgrades(upgrades);
  res.status(201).json({ ok: true, id: entry.id });
});

app.listen(PORT, () => {
  console.log(`Divinity upgrade API on http://localhost:${PORT}`);
});
