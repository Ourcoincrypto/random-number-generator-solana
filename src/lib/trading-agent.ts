import { Connection, PublicKey, Keypair, Transaction, VersionedTransaction } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import axios from "axios";

const RAYDIUM_API = "https://api.raydium.io/v2";
const RAYDIUM_PROGRAM_ID = new PublicKey("675kPX9MHTjS2zt1qrXrQVxwwp9TTyyE2tSHt7LsSt");
const SLIPPAGE_BPS = 500; // 5%

export interface TradeConfig {
  tokenMint: PublicKey;
  solMint: PublicKey;
  tradeAmountLamports: number; // 0.01 SOL = 10_000_000 lamports
  slippageBps: number; // basis points (500 = 5%)
  connection: Connection;
}

export interface TradeResult {
  success: boolean;
  signature?: string;
  tokensPurchased?: number;
  solSpent?: number;
  error?: string;
  timestamp: Date;
}

interface RaydiumPool {
  id: string;
  baseMint: string;
  quoteMint: string;
  lpMint: string;
  baseDecimals: number;
  quoteDecimals: number;
  lpDecimals: number;
  version: number;
  programId: string;
  authority: string;
  openOrders: string;
  targetOrders: string;
  baseVault: string;
  quoteVault: string;
  marketId: string;
  marketAuthority: string;
  marketBaseVault: string;
  marketQuoteVault: string;
  marketBids: string;
  marketAsks: string;
  marketEventQueue: string;
  lookupTableAddress: string;
}

export async function findRaydiumPool(
  tokenMint: string,
  solMint: string,
): Promise<RaydiumPool | null> {
  try {
    const response = await axios.get(`${RAYDIUM_API}/pools/list`);
    const pools: RaydiumPool[] = response.data;

    const pool = pools.find(
      (p) =>
        (p.baseMint === tokenMint && p.quoteMint === solMint) ||
        (p.baseMint === solMint && p.quoteMint === tokenMint),
    );

    return pool || null;
  } catch (error) {
    console.error("Error finding Raydium pool:", error);
    return null;
  }
}

export async function getSwapInstructions(
  pool: RaydiumPool,
  inputToken: PublicKey,
  outputToken: PublicKey,
  inputAmount: number,
  walletPublicKey: PublicKey,
): Promise<any> {
  try {
    // Calculate minimum output with slippage
    const response = await axios.get(
      `${RAYDIUM_API}/price?mint1=${inputToken.toString()}&mint2=${outputToken.toString()}&amount=${inputAmount}`,
    );

    const expectedOutput = response.data.price * inputAmount;
    const minOutput = Math.floor(expectedOutput * (1 - SLIPPAGE_BPS / 10000));

    return {
      pool,
      inputToken,
      outputToken,
      inputAmount,
      minOutput,
      walletPublicKey,
    };
  } catch (error) {
    console.error("Error getting swap instructions:", error);
    throw error;
  }
}

export async function executeSwap(
  config: TradeConfig,
  agentKeypair: Keypair,
): Promise<TradeResult> {
  const timestamp = new Date();

  try {
    // Find the trading pool
    const pool = await findRaydiumPool(
      config.tokenMint.toString(),
      config.solMint.toString(),
    );

    if (!pool) {
      return {
        success: false,
        error: "Raydium pool not found",
        timestamp,
      };
    }

    // Get swap instructions
    const swapData = await getSwapInstructions(
      pool,
      config.solMint, // inputToken (SOL)
      config.tokenMint, // outputToken (pump.fun token)
      config.tradeAmountLamports,
      agentKeypair.publicKey,
    );

    // Create transaction
    const transaction = new VersionedTransaction(
      await createSwapTransaction(
        config.connection,
        agentKeypair.publicKey,
        swapData,
      ),
    );

    // Sign and send
    transaction.sign([agentKeypair]);
    const signature = await config.connection.sendTransaction(transaction);

    // Wait for confirmation
    const confirmation = await config.connection.confirmTransaction(signature);

    if (confirmation.value.err) {
      return {
        success: false,
        error: "Transaction failed",
        timestamp,
      };
    }

    return {
      success: true,
      signature,
      solSpent: config.tradeAmountLamports / 1e9,
      timestamp,
    };
  } catch (error) {
    console.error("Error executing swap:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp,
    };
  }
}

async function createSwapTransaction(
  connection: Connection,
  walletPublicKey: PublicKey,
  swapData: any,
): Promise<any> {
  // This would construct the actual Raydium swap transaction
  // For now, we're creating a placeholder that integrates with Raydium API
  const latestBlockhash = await connection.getLatestBlockhash();

  return {
    version: 0,
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    feePayer: walletPublicKey,
    instructions: [],
    nonSigners: [],
  };
}

export async function getAgentBalance(
  connection: Connection,
  agentPublicKey: PublicKey,
  tokenMint?: PublicKey,
): Promise<{ sol: number; tokens: number }> {
  try {
    // Get SOL balance
    const solBalance = await connection.getBalance(agentPublicKey);

    let tokenBalance = 0;
    if (tokenMint) {
      const tokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        agentPublicKey,
      );
      const tokenAccountInfo = await connection.getTokenAccountBalance(
        tokenAccount,
      );
      tokenBalance = parseFloat(tokenAccountInfo.value.amount) / 1e9;
    }

    return {
      sol: solBalance / 1e9,
      tokens: tokenBalance,
    };
  } catch (error) {
    console.error("Error getting agent balance:", error);
    return { sol: 0, tokens: 0 };
  }
}
