// mint.js
(function() {
  async function divinityMint(provider, candyMachineId, rpcUrl) {
    if (!provider?.publicKey || !candyMachineId || !rpcUrl) {
      throw new Error("Wallet, Candy Machine ID, and RPC URL are required.");
    }
    const { Connection, VersionedTransaction } = await import("https://esm.sh/@solana/web3.js");
    const umiBundle = await import("https://esm.sh/@metaplex-foundation/umi-bundle-defaults");
    const candyMachinePkg = await import("https://esm.sh/@metaplex-foundation/mpl-candy-machine");
    const { publicKey, transactionBuilder, generateSigner, some } = await import("https://esm.sh/@metaplex-foundation/umi");
    const { setComputeUnitLimit } = await import("https://esm.sh/@metaplex-foundation/mpl-toolbox");
    const createUmi = umiBundle.createUmi;
    const mplCandyMachine = candyMachinePkg.mplCandyMachine || candyMachinePkg.default;
    const fetchCandyMachine = candyMachinePkg.fetchCandyMachine;
    const mintV2 = candyMachinePkg.mintV2;
    const umi = createUmi(rpcUrl).use(mplCandyMachine());
    const bs58 = (await import("https://esm.sh/bs58")).default;
    const payerPubkey = publicKey(provider.publicKey.toString());
    umi.identity = { publicKey: payerPubkey };
    umi.payer = { publicKey: payerPubkey };
    const cmKey = publicKey(candyMachineId);
    const candyMachine = await fetchCandyMachine(umi, cmKey);
    if (!candyMachine.collectionMint || !candyMachine.authority) {
      throw new Error("Candy Machine missing collection info.");
    }
    const nftMint = generateSigner(umi);
    const builder = transactionBuilder().add(setComputeUnitLimit(umi, { units: 8e5 })).add(mintV2(umi, {
      candyMachine: cmKey,
      nftMint,
      collectionMint: candyMachine.collectionMint,
      collectionUpdateAuthority: candyMachine.authority,
      mintArgs: {
        solPayment: some({ destination: publicKey("FTCQPhg846q25KuVkQa6Nyb2TYPJjdYayqWdSLBijPBX") })
      }
    }));
    let tx = await builder.buildWithLatestBlockhash(umi);
    tx = await nftMint.signTransaction(tx);
    const serializedTx = umi.transactions.serialize(tx);
    const web3Tx = VersionedTransaction.deserialize(serializedTx);
    const signedWeb3Tx = await provider.signTransaction(web3Tx);
    if (!signedWeb3Tx) {
      throw new Error("You rejected the signature, or the wallet did not return a transaction.");
    }
    const signedBytes = signedWeb3Tx.serialize();
    if (signedBytes.length < 50) {
      throw new Error("Signed transaction too short.");
    }
    const conn = new Connection(rpcUrl);
    const sig = await conn.sendRawTransaction(signedBytes, { skipPreflight: true, preflightCommitment: "confirmed" });
    const latest = await conn.getLatestBlockhash("confirmed");
    await conn.confirmTransaction(
      { signature: sig, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight },
      "confirmed"
    );
  }
  window.divinityMint = divinityMint;
})();
