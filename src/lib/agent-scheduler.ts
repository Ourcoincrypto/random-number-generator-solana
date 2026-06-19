import cron from "node-cron";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { executeSwap, getAgentBalance, TradeConfig, TradeResult } from "./trading-agent";

export interface SchedulerConfig {
  cronExpression: string; // e.g., "0 */4 * * *" for every 4 hours
  enabled: boolean;
  connection: Connection;
  agentKeypair: Keypair;
  tradeConfig: TradeConfig;
}

let tradeHistory: TradeResult[] = [];
let isRunning = false;

export function startTradingScheduler(config: SchedulerConfig) {
  if (isRunning) {
    console.warn("Scheduler already running");
    return;
  }

  if (!config.enabled) {
    console.log("Trading scheduler disabled");
    return;
  }

  console.log(`Starting trading scheduler with cron: ${config.cronExpression}`);

  cron.schedule(config.cronExpression, async () => {
    console.log("[Trading Agent] Executing periodic trade...");
    await executeTrade(config);
  });

  isRunning = true;
  console.log("Trading scheduler started");
}

async function executeTrade(config: SchedulerConfig) {
  try {
    // Check balance
    const balance = await getAgentBalance(
      config.connection,
      config.agentKeypair.publicKey,
      config.tradeConfig.tokenMint,
    );

    if (balance.sol < 0.01) {
      console.log("[Trading Agent] Insufficient SOL balance. Skipping trade.");
      return;
    }

    // Execute swap
    const result = await executeSwap(config.tradeConfig, config.agentKeypair);

    // Store result
    tradeHistory.push(result);
    if (tradeHistory.length > 1000) {
      tradeHistory = tradeHistory.slice(-1000); // Keep last 1000 trades
    }

    if (result.success) {
      console.log(`[Trading Agent] ✅ Trade successful!`, {
        signature: result.signature,
        solSpent: result.solSpent,
        timestamp: result.timestamp,
      });
    } else {
      console.log(`[Trading Agent] ❌ Trade failed: ${result.error}`);
    }
  } catch (error) {
    console.error("[Trading Agent] Error during trade execution:", error);
  }
}

export function stopTradingScheduler() {
  isRunning = false;
  console.log("Trading scheduler stopped");
}

export function getTradeHistory(): TradeResult[] {
  return tradeHistory;
}

export function getTradeStats() {
  const successfulTrades = tradeHistory.filter((t) => t.success);
  const totalSolSpent = successfulTrades.reduce(
    (sum, t) => sum + (t.solSpent || 0),
    0,
  );
  const totalTokensPurchased = successfulTrades.reduce(
    (sum, t) => sum + (t.tokensPurchased || 0),
    0,
  );

  return {
    totalTrades: tradeHistory.length,
    successfulTrades: successfulTrades.length,
    failedTrades: tradeHistory.length - successfulTrades.length,
    totalSolSpent,
    totalTokensPurchased,
    successRate:
      tradeHistory.length > 0
        ? (successfulTrades.length / tradeHistory.length) * 100
        : 0,
  };
}

export function isSchedulerRunning(): boolean {
  return isRunning;
}
