import type { NextApiRequest, NextApiResponse } from "next";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { startTradingScheduler } from "@/lib/agent-scheduler";

type ResponseData = {
  success: boolean;
  message?: string;
  error?: string;
};

let schedulerStarted = false;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    if (schedulerStarted) {
      return res.status(400).json({
        success: false,
        message: "Scheduler already started",
      });
    }

    const rpcUrl = process.env.SOLANA_RPC_URL || "https://rpc.solanatracker.io/public";
    const agentPrivateKey = process.env.AGENT_PRIVATE_KEY;
    const tokenMint = process.env.AGENT_TOKEN_MINT_ADDRESS;

    if (!agentPrivateKey) {
      return res.status(400).json({
        success: false,
        error: "AGENT_PRIVATE_KEY not configured",
      });
    }

    if (!tokenMint) {
      return res.status(400).json({
        success: false,
        error: "AGENT_TOKEN_MINT_ADDRESS not configured",
      });
    }

    const connection = new Connection(rpcUrl);
    const agentKeypair = Keypair.fromSecretKey(
      Buffer.from(agentPrivateKey, "base64"),
    );

    const solMint = new PublicKey("So11111111111111111111111111111111111111112");
    const tradeConfig = {
      tokenMint: new PublicKey(tokenMint),
      solMint,
      tradeAmountLamports: 10_000_000, // 0.01 SOL
      slippageBps: 500, // 5%
      connection,
    };

    startTradingScheduler({
      cronExpression: "0 */4 * * *", // Every 4 hours
      enabled: true,
      connection,
      agentKeypair,
      tradeConfig,
    });

    schedulerStarted = true;

    return res.status(200).json({
      success: true,
      message: "Trading agent started successfully",
    });
  } catch (error) {
    console.error("Error starting trading agent:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
