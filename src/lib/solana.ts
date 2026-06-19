import { PublicKey, Connection } from "@solana/web3.js";
import { PumpAgent } from "@pump-fun/agent-payments-sdk";

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://rpc.solanatracker.io/public";
const AGENT_TOKEN_MINT = process.env.AGENT_TOKEN_MINT_ADDRESS!;
const CURRENCY_MINT = process.env.CURRENCY_MINT!;
const PRICE_AMOUNT = Number(process.env.PRICE_AMOUNT) || 100000000;

if (!AGENT_TOKEN_MINT) {
  throw new Error("AGENT_TOKEN_MINT_ADDRESS is not set");
}

if (!CURRENCY_MINT) {
  throw new Error("CURRENCY_MINT is not set");
}

export const connection = new Connection(SOLANA_RPC_URL, "confirmed");

export const agentMint = new PublicKey(AGENT_TOKEN_MINT);
export const currencyMintPubkey = new PublicKey(CURRENCY_MINT);
export const priceAmount = PRICE_AMOUNT;

export const getPumpAgent = () => {
  return new PumpAgent(agentMint, "mainnet", connection);
};

export function generateInvoiceParams() {
  const memo = Math.floor(Math.random() * 900000000000) + 100000;
  const now = Math.floor(Date.now() / 1000);
  const startTime = now;
  const endTime = now + 86400; // valid for 24 hours

  return { amount: priceAmount, memo, startTime, endTime };
}
