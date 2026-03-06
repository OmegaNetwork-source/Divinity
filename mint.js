/**
 * Browser mint for Metaplex Candy Machine v3 via Phantom.
 * Loaded as type="module", exposes window.divinityMint(provider, candyMachineId, rpcUrl).
 */
(function () {
  async function divinityMint(provider, candyMachineId, rpcUrl) {
    if (!provider?.publicKey || !candyMachineId || !rpcUrl) {
      throw new Error('Wallet, Candy Machine ID, and RPC URL are required.');
    }

    const { Connection, VersionedTransaction } = await import('https://esm.sh/@solana/web3.js');
    const umiBundle = await import('https://esm.sh/@metaplex-foundation/umi-bundle-defaults');
    const candyMachinePkg = await import('https://esm.sh/@metaplex-foundation/mpl-candy-machine');
    const { publicKey, transactionBuilder, generateSigner, some } = await import('https://esm.sh/@metaplex-foundation/umi');
    const { setComputeUnitLimit, setComputeUnitPrice } = await import('https://esm.sh/@metaplex-foundation/mpl-toolbox');

    const createUmi = umiBundle.createUmi;
    const mplCandyMachine = candyMachinePkg.mplCandyMachine || candyMachinePkg.default;
    const fetchCandyMachine = candyMachinePkg.fetchCandyMachine;
    const mintV2 = candyMachinePkg.mintV2;

    const umi = createUmi(rpcUrl).use(mplCandyMachine());

    const bs58 = (await import('https://esm.sh/bs58')).default;

    const payerPubkey = publicKey(provider.publicKey.toString());
    umi.identity = { publicKey: payerPubkey };
    umi.payer = { publicKey: payerPubkey };

    const cmKey = publicKey(candyMachineId);
    const candyMachine = await fetchCandyMachine(umi, cmKey);
    if (!candyMachine.collectionMint || !candyMachine.authority) {
      throw new Error('Candy Machine missing collection info.');
    }

    const nftMint = generateSigner(umi);
    const treasury = publicKey("FTCQPhg846q25KuVkQa6Nyb2TYPJjdYayqWdSLBijPBX");
    const builder = transactionBuilder()
      .add(setComputeUnitLimit(umi, { units: 800_000 }))
      .add(setComputeUnitPrice(umi, { microLamports: 30_002 })) // Added priority fee
      .add(mintV2(umi, {
        candyMachine: cmKey,
        candyGuard: candyMachine.mintAuthority,
        nftMint,
        collectionMint: candyMachine.collectionMint,
        collectionUpdateAuthority: candyMachine.authority,
        mintArgs: {
          solPayment: some({ destination: treasury })
        }
      }));

    // Fetch blockhash once and reuse for confirmation
    const latest = await umi.rpc.getLatestBlockhash({ commitment: 'confirmed' });
    let tx = await builder.setBlockhash(latest).build(umi);
    tx = await nftMint.signTransaction(tx);

    // Serialize the partially signed transaction into a Uint8Array
    const serializedTx = umi.transactions.serialize(tx);

    // Deserialize into a @solana/web3.js VersionedTransaction
    const web3Tx = VersionedTransaction.deserialize(serializedTx);

    // Ask Phantom to sign the transaction
    let signedWeb3Tx = await provider.signTransaction(web3Tx);

    if (!signedWeb3Tx) {
      throw new Error('You rejected the signature, or the wallet did not return a transaction.');
    }

    // Phantom may return the tx or { serializedTransaction } / { signedTransaction }
    if (typeof signedWeb3Tx.serialize !== 'function') {
      const raw = signedWeb3Tx.serializedTransaction ?? signedWeb3Tx.signedTransaction ?? signedWeb3Tx.transaction;
      if (raw) {
        const bytes = typeof raw === 'string' ? new Uint8Array([...atob(raw)].map((c) => c.charCodeAt(0))) : raw;
        signedWeb3Tx = VersionedTransaction.deserialize(bytes);
      }
    }
    const signedBytes = signedWeb3Tx.serialize();

    if (signedBytes.length < 50) {
      throw new Error('Signed transaction too short.');
    }

    const conn = new Connection(rpcUrl);
    // Send with preflight check for better error reporting if it fails immediately
    const sig = await conn.sendRawTransaction(signedBytes, {
      skipPreflight: false,
      preflightCommitment: 'confirmed'
    });

    // Use the SAME blockhash logic that was used to build the transaction
    await conn.confirmTransaction(
      {
        signature: sig,
        blockhash: latest.blockhash,
        lastValidBlockHeight: latest.lastValidBlockHeight
      },
      'confirmed'
    );

    const txResult = await conn.getTransaction(sig, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 });
    if (txResult?.meta?.err) {
      const errMsg = typeof txResult.meta.err === 'string' ? txResult.meta.err : JSON.stringify(txResult.meta.err);
      throw new Error('Transaction failed on-chain: ' + errMsg + '. See Solscan for details.');
    }
  }

  window.divinityMint = divinityMint;
})();
