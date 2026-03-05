/**
 * USDC payment for upgrades. Exposes window.divinityPayUsdc(provider, amountUsd, rpcUrl).
 * Transfers SPL USDC from user to treasury. USDC has 6 decimals.
 */
(function () {
    const USDC_DECIMALS = 6;

    async function divinityPayUsdc(provider, amountUsd, rpcUrl) {
        if (!provider?.publicKey || !rpcUrl || amountUsd <= 0) {
            throw new Error('Wallet, RPC, and a positive amount are required.');
        }
        const usdcMint = typeof window !== 'undefined' && window.DIVINITY_USDC_MINT;
        const treasury = typeof window !== 'undefined' && window.DIVINITY_USDC_TREASURY;
        if (!usdcMint || !treasury) {
            throw new Error('USDC config missing. Set DIVINITY_USDC_MINT and DIVINITY_USDC_TREASURY.');
        }

        const { Connection, PublicKey, Transaction } = await import('https://esm.sh/@solana/web3.js');
        const splToken = await import('https://esm.sh/@solana/spl-token');
        const getAta = splToken.getAssociatedTokenAddressSync || splToken.getAssociatedTokenAddress;
        const createTransferInstruction = splToken.createTransferInstruction;
        const createAssociatedTokenAccountInstruction = splToken.createAssociatedTokenAccountInstruction;
        const TOKEN_PROGRAM_ID = splToken.TOKEN_PROGRAM_ID;
        const ASSOCIATED_TOKEN_PROGRAM_ID = splToken.ASSOCIATED_TOKEN_PROGRAM_ID;

        const connection = new Connection(rpcUrl);
        const mintPk = new PublicKey(usdcMint);
        const treasuryPk = new PublicKey(treasury);
        const ownerPk = provider.publicKey;

        const amountRaw = BigInt(Math.round(amountUsd * Math.pow(10, USDC_DECIMALS)));

        const fromAtaP = getAta(mintPk, ownerPk, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
        const toAtaP = getAta(mintPk, treasuryPk, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
        const fromAta = fromAtaP instanceof Promise ? await fromAtaP : fromAtaP;
        const toAta = toAtaP instanceof Promise ? await toAtaP : toAtaP;

        const instructions = [];

        const toAccountInfo = await connection.getAccountInfo(toAta);
        if (!toAccountInfo) {
            instructions.push(createAssociatedTokenAccountInstruction(
                ownerPk,
                toAta,
                treasuryPk,
                mintPk
            ));
        }

        instructions.push(createTransferInstruction(
            fromAta,
            toAta,
            ownerPk,
            amountRaw,
            [],
            TOKEN_PROGRAM_ID
        ));

        const tx = new Transaction().add(...instructions);
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.feePayer = ownerPk;

        const signed = await provider.signTransaction(tx);
        if (!signed) throw new Error('You rejected the transaction.');
        const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false });
        await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');
        return sig;
    }

    if (typeof window !== 'undefined') {
        window.divinityPayUsdc = divinityPayUsdc;
    }
})();
