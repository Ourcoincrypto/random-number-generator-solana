import type { NextApiRequest, NextApiResponse } from "next";
import { getTradeStats, isSchedulerRunning, getTradeHistory } from "@/lib/agent-scheduler";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAgentBalance } from "@/lib/trading-agent";

type ResponseData = {
  success: boolean;
  running?: boolean;
  stats?: any;
  balance?: { sol: number; tokens: number };
  recentTrades?: any[];
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const rpcUrl = process.env.SOLANA_RPC_URL || "https://rpc.solanatracker.io/public";
    const agentPrivateKey = process.env.AGENT_PRIVATE_KEY;
    const tokenMint = process.env.AGENT_TOKEN_MINT_ADDRESS;

    if (!agentPrivateKey || !tokenMint) {
      return res.status(400).json({
        success: false,
        error: "Agent not configured",
      });
    }

    const connection = new Connection(rpcUrl);
    const agentPublicKey = new PublicKey(process.env.AGENT_PUBLIC_KEY || "");
    const tokenMintPubkey = new PublicKey(tokenMint);

    const stats = getTradeStats();
    const balance = await getAgentBalance(connection, agentPublicKey, tokenMintPubkey);
    const recentTrades = getTradeHistory().slice(-10).reverse();

    return res.status(200).json({
      success: true,
      running: isSchedulerRunning(),
      stats,
      balance,
      recentTrades,
    });
  } catch (error) {
    console.error("Error getting agent status:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
