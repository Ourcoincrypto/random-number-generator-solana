import type { NextApiRequest, NextApiResponse } from "next";

type ResponseData = {
  success: boolean;
  randomNumber?: number;
  error?: string;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { verified } = req.body;

    if (!verified) {
      return res.status(401).json({
        success: false,
        error: "Payment not verified. Please complete the payment first.",
      });
    }

    // Generate random number between 0 and 1000
    const randomNumber = Math.floor(Math.random() * 1001);

    return res.status(200).json({
      success: true,
      randomNumber,
    });
  } catch (error) {
    console.error("Error generating random number:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
