/**
 * Fetch Divinity NFTs owned by a wallet (by collection). Exposes window.fetchDivinityNfts(rpcUrl, ownerPubkey, collectionMint).
 */
(function () {
  const METADATA_PROGRAM_ID = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s';
  const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

  function parseMetadataUri(data) {
    if (!data || data.length < 82) return null;
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    let offset = 65;
    const nameLen = view.getUint32(offset, true);
    offset += 4 + nameLen;
    if (offset + 8 > data.length) return null;
    const symbolLen = view.getUint32(offset, true);
    offset += 4 + symbolLen;
    if (offset + 4 > data.length) return null;
    const uriLen = view.getUint32(offset, true);
    offset += 4;
    if (offset + uriLen > data.length) return null;
    return new TextDecoder().decode(data.subarray(offset, offset + uriLen));
  }

  async function fetchDivinityNfts(rpcUrl, ownerPubkey, collectionMint) {
    const owner = typeof ownerPubkey === 'string' ? ownerPubkey : ownerPubkey?.toBase58?.() || ownerPubkey?.toString?.();
    if (!owner || !rpcUrl) return [];

    const { Connection, PublicKey } = await import('https://esm.sh/@solana/web3.js');
    const conn = new Connection(rpcUrl);

    const tokenAccounts = await conn.getParsedTokenAccountsByOwner(new PublicKey(owner), {
      programId: new PublicKey(TOKEN_PROGRAM_ID)
    });

    const nftMints = [];
    const list = tokenAccounts.value || tokenAccounts;
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      const info = item.account?.data?.parsed?.info || item.data?.parsed?.info;
      if (!info) continue;
      const amount = info.tokenAmount?.amount;
      const decimals = info.tokenAmount?.decimals;
      const mint = info.mint;
      if (String(amount) === '1' && Number(decimals) === 0 && mint) {
        nftMints.push(mint);
      }
    }

    const metaProgramId = new PublicKey(METADATA_PROGRAM_ID);
    const results = [];

    for (const mint of nftMints) {
      let name = 'NFT';
      let image = '';
      try {
        const mintKey = new PublicKey(mint);
        const [pda] = PublicKey.findProgramAddressSync(
          [
            new TextEncoder().encode('metadata'),
            metaProgramId.toBytes(),
            mintKey.toBytes()
          ],
          metaProgramId
        );
        const acc = await conn.getAccountInfo(pda);
        if (acc?.data) {
          const raw = acc.data;
          const data = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
          const uri = parseMetadataUri(data);
          if (uri) {
            const cleanUri = uri.replace(/\0/g, '');
            const json = await fetch(cleanUri).then((r) => (r.ok ? r.json() : null)).catch(() => null);
            if (json) {
              name = json.name ?? 'NFT';
              image = json.image ?? json.image_url ?? '';
            }
          }
        }
      } catch (_) {
        /* use placeholder */
      }

      if (typeof name === 'string' && name.startsWith('Divinity')) {
        results.push({ mint, name, image });
      }
    }

    return results;
  }

  window.fetchDivinityNfts = fetchDivinityNfts;
})();
