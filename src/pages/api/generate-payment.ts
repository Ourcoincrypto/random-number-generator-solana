import type { NextApiRequest, NextApiResponse } from "next";
import { Transaction } from "@solana/web3.js";
import { PumpAgent } from "@pump-fun/agent-payments-sdk";
import {
  connection,
  agentMint,
  currencyMintPubkey,
  generateInvoiceParams,
} from "@/lib/solana";

type ResponseData = {
  success: boolean;
  transaction?: string;
  invoiceParams?: {
    amount: number;
    memo: number;
    startTime: number;
    endTime: number;
  };
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { userWallet } = req.body;

    if (!userWallet) {
      return res.status(400).json({ success: false, error: "userWallet is required" });
    }

    // Generate unique invoice parameters
    const invoiceParams = generateInvoiceParams();

    // Build payment instructions
    const agent = new PumpAgent(agentMint, "mainnet", connection);
    const instructions = await agent.buildAcceptPaymentInstructions({
      user: userWallet,
      currencyMint: currencyMintPubkey,
      amount: invoiceParams.amount.toString(),
      memo: invoiceParams.memo.toString(),
      startTime: invoiceParams.startTime.toString(),
      endTime: invoiceParams.endTime.toString(),
    });

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash("confirmed");

    // Build transaction
    const transaction = new Transaction();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userWallet;
    transaction.add(...instructions);

    // Serialize as base64
    const serializedTx = transaction
      .serialize({ requireAllSignatures: false })
      .toString("base64");

    return res.status(200).json({
      success: true,
      transaction: serializedTx,
      invoiceParams,
    });
  } catch (error) {
    console.error("Error generating payment transaction:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
