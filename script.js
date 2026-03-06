// ─────────── Phantom Wallet & Mint ───────────
const btnMint = document.getElementById('btn-mint');
const btnMintText = document.getElementById('btn-mint-text');
const navWalletBtn = document.getElementById('nav-wallet-btn');
const navWalletBtnText = navWalletBtn ? navWalletBtn.querySelector('.nav-wallet-btn-text') : null;
const walletHint = document.getElementById('wallet-hint');

// Mint price in SOL (~50 cents at typical SOL prices)
const MINT_PRICE_SOL = 0.005;
// Total SOL needed: mint price + rent for new NFT accounts (~0.015 SOL). Use a small buffer.
const MIN_SOL_FOR_MINT = 0.022;

// Set after deploying Candy Machine with Sugar (see MINT_SETUP.md)
const CANDY_MACHINE_ID = '2LnEZA5LquK5td6G5RtdgpPxhTNgN2tGENQyrRo8ta6g';
// RPC from config.local.js (gitignored) or fallback. Copy config.local.js.example → config.local.js with your key.
const RPC_URL = (typeof window !== 'undefined' && window.DIVINITY_RPC_URL) || 'https://mainnet.helius-rpc.com/?api-key=f1722970-f727-465e-bbc2-5b4d2ba7884c';
// Divinity collection mint (from sugar deploy / cache.json) – used on upgrades page to list user's NFTs
const COLLECTION_MINT = 'CU9DXF5f9dJCUXV9oFwoFPoJVisH8H3tG49HyEkbEqs4';
// Upgrade API (Node server in /server)
const UPGRADE_API_URL = 'https://divinity-production.up.railway.app';

// USDC for upgrades ($5 / $10 / $20). Devnet = test USDC; mainnet = real USDC.
const USDC_MINT_DEVNET = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
const USDC_MINT_MAINNET = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDC_TREASURY = 'FTCQPhg846q25KuVkQa6Nyb2TYPJjdYayqWdSLBijPBX';
const USDC_MINT = RPC_URL.includes('devnet') ? USDC_MINT_DEVNET : USDC_MINT_MAINNET;

if (typeof window !== 'undefined') {
    window.DIVINITY_RPC_URL = RPC_URL;
    window.DIVINITY_COLLECTION_MINT = COLLECTION_MINT;
    window.DIVINITY_UPGRADE_API_URL = UPGRADE_API_URL;
    window.CANDY_MACHINE_ID = CANDY_MACHINE_ID;
    window.DIVINITY_USDC_MINT = USDC_MINT;
    window.DIVINITY_USDC_TREASURY = USDC_TREASURY;
}

function getPhantomProvider() {
    if (typeof window === 'undefined') return null;
    // Phantom injects into window.phantom.solana; some environments use window.solana
    if (window.phantom?.solana?.isPhantom) return window.phantom.solana;
    if (window.solana?.isPhantom) return window.solana;
    return null;
}

function isFileProtocol() {
    return window.location.protocol === 'file:';
}

function truncateAddress(pubkey, start = 4, end = 4) {
    const str = typeof pubkey === 'string' ? pubkey : pubkey.toString();
    if (str.length <= start + end) return str;
    return str.slice(0, start) + '…' + str.slice(-end);
}

function updateWalletUI(connected, publicKey) {
    const provider = getPhantomProvider();

    // Nav wallet button (top right): Connect Wallet | truncated address (click to disconnect)
    if (navWalletBtn && navWalletBtnText) {
        if (!provider) {
            navWalletBtnText.textContent = isFileProtocol() ? 'Connect Wallet' : 'Install Phantom';
            navWalletBtn.title = 'Connect wallet';
        } else if (connected && publicKey) {
            navWalletBtnText.textContent = truncateAddress(publicKey.toString());
            navWalletBtn.title = 'Click to disconnect · ' + publicKey.toString();
        } else {
            navWalletBtnText.textContent = 'Connect Wallet';
            navWalletBtn.title = 'Connect wallet';
        }
    }

    if (!provider) {
        if (isFileProtocol()) {
            if (btnMintText) btnMintText.textContent = 'CONNECT WALLET';
            if (walletHint) { walletHint.innerHTML = 'Phantom doesn’t work when opening the file directly. <strong>Use a local server</strong>: run <code>npx serve</code> in this folder, then open <code>http://localhost:3000</code> in your browser.'; walletHint.style.display = 'block'; }
        } else {
            if (btnMintText) btnMintText.textContent = 'INSTALL PHANTOM';
            if (walletHint) { walletHint.textContent = 'Install the Phantom extension to connect.'; walletHint.style.display = 'block'; }
        }
        return;
    }
    if (walletHint) walletHint.style.display = 'none';
    if (btnMintText) btnMintText.textContent = (connected && publicKey) ? 'MINT' : 'CONNECT WALLET';
}

async function connectPhantom() {
    const provider = getPhantomProvider();
    if (!provider) {
        window.open('https://phantom.app/', '_blank');
        return;
    }
    try {
        const { publicKey } = await provider.connect();
        updateWalletUI(true, publicKey);
    } catch (err) {
        if (err.code === 4001) {
            console.log('User rejected connection');
        } else {
            console.error('Phantom connect error:', err);
            if (walletHint) { walletHint.textContent = 'Connection failed. Try again.'; walletHint.style.display = 'block'; }
        }
    }
}

function disconnectPhantom() {
    const provider = getPhantomProvider();
    if (provider) {
        provider.disconnect();
        updateWalletUI(false, null);
    }
}

async function handleMintClick() {
    const provider = getPhantomProvider();
    if (!provider?.isConnected || !provider.publicKey) return;

    if (!CANDY_MACHINE_ID) {
        walletHint.innerHTML = 'Mint not configured yet. Deploy a Candy Machine with Sugar, then set <code>CANDY_MACHINE_ID</code> in script.js. See <strong>MINT_SETUP.md</strong>.';
        walletHint.style.display = 'block';
        return;
    }

    try {
        const rpcRes = await fetch(RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'getBalance',
                params: [provider.publicKey.toString()]
            })
        });
        const rpcJson = await rpcRes.json();
        const lamports = rpcJson?.result?.value ?? 0;
        const balanceSol = lamports / 1e9;
        if (balanceSol < MIN_SOL_FOR_MINT) {
            walletHint.textContent = 'Not enough SOL. Mint is 0.005 SOL; your wallet also needs ~0.015 SOL for Solana rent (creating the NFT). You have ' + balanceSol.toFixed(4) + ' SOL. Add SOL and try again.';
            walletHint.style.display = 'block';
            return;
        }
    } catch (e) {
        console.warn('Balance check failed, continuing anyway', e);
    }

    walletHint.style.display = 'none';
    btnMint.disabled = true;
    btnMintText.textContent = 'MINTING…';

    try {
        if (typeof window.divinityMint === 'function') {
            await window.divinityMint(provider, CANDY_MACHINE_ID, RPC_URL);
            btnMintText.textContent = 'MINTED!';
            walletHint.textContent = 'Success! Check your wallet for the NFT.';
            walletHint.style.display = 'block';
        } else {
            walletHint.innerHTML = 'To mint from the browser, add a mint integration (see MINT_SETUP.md). You can mint now from the CLI: <code>sugar mint</code>.';
            walletHint.style.display = 'block';
            btnMintText.textContent = 'MINT';
        }
    } catch (err) {
        console.error('Mint error:', err);
        let msg = err?.message || 'Mint failed. Try again or check the console.';
        if (msg.includes('Custom:1') || /insufficient|not enough|funds/i.test(msg)) {
            msg += ' Mint costs 0.005 SOL; your wallet also needs ~0.015 SOL for Solana rent (we don’t get that—the network uses it to create the NFT).';
        }
        walletHint.textContent = msg;
        walletHint.style.display = 'block';
        btnMintText.textContent = 'MINT';
    } finally {
        btnMint.disabled = false;
    }
}

function initWallet() {
    const provider = getPhantomProvider();
    if (provider) {
        if (provider.isConnected && provider.publicKey) {
            updateWalletUI(true, provider.publicKey);
        } else {
            provider.connect({ onlyIfTrusted: true })
                .then(({ publicKey }) => updateWalletUI(true, publicKey))
                .catch(() => updateWalletUI(false, null));
        }
        provider.on('connect', (publicKey) => updateWalletUI(true, publicKey));
        provider.on('disconnect', () => updateWalletUI(false, null));
        provider.on('accountChanged', (publicKey) => {
            updateWalletUI(!!publicKey, publicKey || null);
        });
    } else {
        updateWalletUI(false, null);
    }

    // Nav wallet box: click = connect when disconnected, disconnect when connected
    if (navWalletBtn) {
        navWalletBtn.addEventListener('click', () => {
            const p = getPhantomProvider();
            if (!p) {
                window.open('https://phantom.app/', '_blank');
                return;
            }
            if (p.isConnected) {
                disconnectPhantom();
            } else {
                connectPhantom();
            }
        });
    }

    if (btnMint) btnMint.addEventListener('click', () => {
        const p = getPhantomProvider();
        if (!p) return;
        if (p.isConnected) {
            handleMintClick();
        } else {
            connectPhantom();
        }
    });
}

initWallet();

// Cursor Logic
const cursor = document.getElementById('custom-cursor');
const trail = document.getElementById('cursor-trail');

document.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';

    // Trail lags slightly
    setTimeout(() => {
        trail.style.left = e.clientX + 'px';
        trail.style.top = e.clientY + 'px';
    }, 50);
});

document.querySelectorAll('a, button').forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('hovering'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('hovering'));
});

// Theme Toggle Logic
const toggleBtn = document.getElementById('realm-toggle');
const statusText = document.getElementById('status-text');
const labels = {
    heaven: document.querySelector('.label-heaven'),
    hell: document.querySelector('.label-hell')
};
let isHeavenMode = true;

function applyTheme(heaven) {
    isHeavenMode = !!heaven;
    document.body.classList.remove('theme-heaven', 'theme-hell');
    document.body.classList.add(isHeavenMode ? 'theme-heaven' : 'theme-hell');
    if (labels.heaven) labels.heaven.classList.toggle('active', isHeavenMode);
    if (labels.hell) labels.hell.classList.toggle('active', !isHeavenMode);
    if (statusText) statusText.textContent = isHeavenMode ? "ELYSIUM" : "TARTARUS";
    if (typeof initParticles === 'function') initParticles();
}

window.divinitySetTheme = function (theme) {
    applyTheme(theme !== 'hell');
};

if (toggleBtn) toggleBtn.addEventListener('click', () => {
    applyTheme(!isHeavenMode);
});

// Advanced Canvas Particles (Million Dollar Effect)
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
let width, height;

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

class Particle {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * width;
        this.y = isHeavenMode ? Math.random() * height : height + Math.random() * 200;
        this.size = Math.random() * (isHeavenMode ? 2 : 5) + (isHeavenMode ? 0.5 : 1);
        this.speedX = Math.random() * 1 - 0.5;

        // Heaven falls slowly, Hell rises quickly
        this.speedY = isHeavenMode ? (Math.random() * 0.5 + 0.2) : -(Math.random() * 3 + 1);

        this.life = Math.random() * 100;
        this.maxLife = 100 + Math.random() * 100;
        this.alpha = 0;
    }

    update() {
        this.x += this.speedX + (isHeavenMode ? Math.sin(this.life * 0.05) * 0.3 : Math.sin(this.life * 0.1) * 1.5);
        this.y += this.speedY;
        this.life++;

        // Fade in and out
        if (this.life < 30) {
            this.alpha = this.life / 30;
        } else if (this.life > this.maxLife - 30) {
            this.alpha = (this.maxLife - this.life) / 30;
        } else {
            this.alpha = 1;
        }

        if (this.life >= this.maxLife || this.y < -50 || (isHeavenMode && this.y > height + 50)) {
            this.reset();
            if (!isHeavenMode) { this.y = height + 10; }
        }
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);

        // Heaven: Gold dust / Stars (more particles, slight flicker) | Hell: Flames / Embers
        if (isHeavenMode) {
            const flicker = 0.7 + 0.3 * Math.sin(this.life * 0.2);
            ctx.fillStyle = `rgba(220, 180, 80, ${this.alpha * 0.6 * flicker})`;
            ctx.shadowBlur = 8 + flicker * 6;
            ctx.shadowColor = 'rgba(255, 220, 100, 0.8)';
        } else {
            // Flame colors: yellow-orange at bottom, red as they rise
            const t = this.y / height;
            const r = 255;
            const g = Math.floor(60 + t * 140 + (this.life % 40));
            const b = Math.floor(Math.random() * 20);
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${this.alpha * 0.85})`;
            ctx.shadowBlur = 12 + this.size;
            ctx.shadowColor = `rgba(255, ${g * 0.8}, 0, 0.9)`;
        }

        ctx.fill();
        ctx.shadowBlur = 0; // reset
    }
}

let particles = [];
function initParticles() {
    particles = [];
    const particleCount = isHeavenMode ? 380 : 580;
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }
}

function animate() {
    // Clear canvas based on theme
    ctx.clearRect(0, 0, width, height);

    particles.forEach(p => {
        p.update();
        p.draw();
    });

    requestAnimationFrame(animate);
}

initParticles();
animate();
