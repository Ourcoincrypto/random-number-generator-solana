import type { NextApiRequest, NextApiResponse } from "next";
import { PublicKey } from "@solana/web3.js";
import { PumpAgent } from "@pump-fun/agent-payments-sdk";
import { agentMint, currencyMintPubkey } from "@/lib/solana";

type ResponseData = {
  success: boolean;
  verified?: boolean;
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
    const { userWallet, amount, memo, startTime, endTime } = req.body;

    // Validate all required fields
    if (!userWallet || amount === undefined || !memo || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: userWallet, amount, memo, startTime, endTime",
      });
    }

    // Verify payment with retries
    const agent = new PumpAgent(agentMint);
    let verified = false;

    for (let attempt = 0; attempt < 10; attempt++) {
      verified = await agent.validateInvoicePayment({
        user: new PublicKey(userWallet),
        currencyMint: currencyMintPubkey,
        amount: Number(amount),
        memo: Number(memo),
        startTime: Number(startTime),
        endTime: Number(endTime),
      });

      if (verified) {
        break;
      }

      // Wait 2 seconds before retry
      if (attempt < 9) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    return res.status(200).json({
      success: true,
      verified,
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
