import React, { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Transaction } from "@solana/web3.js";
import styles from "@/styles/Home.module.css";

interface InvoiceParams {
  amount: number;
  memo: number;
  startTime: number;
  endTime: number;
}

export default function Home() {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [loading, setLoading] = useState(false);
  const [randomNumber, setRandomNumber] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState<"idle" | "building" | "signing" | "verifying">("idle");
  const [invoiceParams, setInvoiceParams] = useState<InvoiceParams | null>(null);

  const handleGeneratePayment = async () => {
    if (!publicKey) {
      setError("Please connect your wallet first");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setPaymentStep("building");

      // Step 1: Request payment transaction from server
      const response = await fetch("/api/generate-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userWallet: publicKey.toString() }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate payment transaction");
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to generate payment transaction");
      }

      setInvoiceParams(data.invoiceParams);

      // Step 2: Deserialize and sign transaction
      setPaymentStep("signing");
      const txBuffer = Buffer.from(data.transaction, "base64");
      const tx = Transaction.from(txBuffer);

      if (!signTransaction) {
        throw new Error("Wallet does not support signing");
      }

      const signedTx = await signTransaction(tx);

      // Step 3: Send signed transaction
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });

      // Wait for confirmation
      const latestBlockhash = await connection.getLatestBlockhash("confirmed");
      await connection.confirmTransaction(
        { signature, ...latestBlockhash },
        "confirmed",
      );

      // Step 4: Verify payment on backend
      setPaymentStep("verifying");
      const verifyResponse = await fetch("/api/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userWallet: publicKey.toString(),
          ...data.invoiceParams,
        }),
      });

      if (!verifyResponse.ok) {
        throw new Error("Failed to verify payment");
      }

      const verifyData = await verifyResponse.json();

      if (!verifyData.success || !verifyData.verified) {
        throw new Error("Payment verification failed");
      }

      // Step 5: Generate random number
      const randomResponse = await fetch("/api/generate-random", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified: true }),
      });

      if (!randomResponse.ok) {
        throw new Error("Failed to generate random number");
      }

      const randomData = await randomResponse.json();

      if (!randomData.success) {
        throw new Error(randomData.error || "Failed to generate random number");
      }

      setRandomNumber(randomData.randomNumber);
      setPaymentStep("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      setPaymentStep("idle");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>Random Number Generator</h1>
        <p className={styles.subtitle}>Pay 0.1 SOL to generate a random number between 0 and 1000</p>

        <div className={styles.walletSection}>
          <WalletMultiButton />
        </div>

        {publicKey && (
          <div className={styles.actionSection}>
            <button
              className={styles.button}
              onClick={handleGeneratePayment}
              disabled={loading}
            >
              {loading ? (
                <span>
                  {paymentStep === "building" && "Building Transaction..."}
                  {paymentStep === "signing" && "Please Sign in Your Wallet..."}
                  {paymentStep === "verifying" && "Verifying Payment..."}
                  {paymentStep === "idle" && "Generating..."}
                </span>
              ) : (
                "Pay & Generate Random Number"
              )}
            </button>
          </div>
        )}

        {randomNumber !== null && (
          <div className={styles.resultSection}>
            <h2>Your Random Number:</h2>
            <p className={styles.randomNumber}>{randomNumber}</p>
            <button
              className={styles.buttonSecondary}
              onClick={() => {
                setRandomNumber(null);
                setError(null);
              }}
            >
              Generate Another
            </button>
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}
      </main>
    </div>
  );
}
