import React, { useState, useEffect } from "react";
import styles from "@/styles/Dashboard.module.css";

interface AgentStats {
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  totalSolSpent: number;
  totalTokensPurchased: number;
  successRate: number;
}

interface Balance {
  sol: number;
  tokens: number;
}

interface TradeResult {
  success: boolean;
  signature?: string;
  tokensPurchased?: number;
  solSpent?: number;
  error?: string;
  timestamp: string;
}

interface AgentStatus {
  running: boolean;
  stats: AgentStats;
  balance: Balance;
  recentTrades: TradeResult[];
}

export default function AgentDashboard() {
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch("/api/agent/status");
        if (!response.ok) throw new Error("Failed to fetch status");
        const data = await response.json();
        setAgentStatus(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();

    if (autoRefresh) {
      const interval = setInterval(fetchStatus, 10000); // Refresh every 10 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const handleStartAgent = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/agent/start", { method: "POST" });
      if (!response.ok) throw new Error("Failed to start agent");
      const data = await response.json();
      if (data.success) {
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className={styles.container}><div className={styles.loading}>Loading...</div></div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>🤖 Trading Agent Dashboard</h1>
        <div className={styles.controls}>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
          {!agentStatus?.running && (
            <button className={styles.startButton} onClick={handleStartAgent}>
              Start Agent
            </button>
          )}
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {agentStatus && (
        <>
          <div className={styles.statusBar}>
            <div className={`${styles.status} ${agentStatus.running ? styles.active : styles.inactive}`}>
              {agentStatus.running ? "🟢 Running" : "🔴 Stopped"}
            </div>
          </div>

          <div className={styles.grid}>
            {/* Balance Section */}
            <div className={styles.card}>
              <h2>Wallet Balance</h2>
              <div className={styles.balanceRow}>
                <div className={styles.balanceItem}>
                  <span className={styles.label}>SOL</span>
                  <span className={styles.value}>{agentStatus.balance.sol.toFixed(4)}</span>
                </div>
                <div className={styles.balanceItem}>
                  <span className={styles.label}>Tokens</span>
                  <span className={styles.value}>{agentStatus.balance.tokens.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Trading Statistics */}
            <div className={styles.card}>
              <h2>Trading Statistics</h2>
              <div className={styles.stats}>
                <div className={styles.statItem}>
                  <span className={styles.label}>Total Trades</span>
                  <span className={styles.value}>{agentStatus.stats.totalTrades}</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.label}>Successful</span>
                  <span className={`${styles.value} ${styles.success}`}>
                    {agentStatus.stats.successfulTrades}
                  </span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.label}>Failed</span>
                  <span className={`${styles.value} ${styles.error}`}>
                    {agentStatus.stats.failedTrades}
                  </span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.label}>Success Rate</span>
                  <span className={styles.value}>
                    {agentStatus.stats.successRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Spending Summary */}
            <div className={styles.card}>
              <h2>Spending Summary</h2>
              <div className={styles.stats}>
                <div className={styles.statItem}>
                  <span className={styles.label}>Total SOL Spent</span>
                  <span className={styles.value}>
                    {agentStatus.stats.totalSolSpent.toFixed(4)} SOL
                  </span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.label}>Total Tokens Purchased</span>
                  <span className={styles.value}>
                    {agentStatus.stats.totalTokensPurchased.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Trades */}
          <div className={styles.recentTrades}>
            <h2>Recent Trades</h2>
            {agentStatus.recentTrades.length === 0 ? (
              <p className={styles.noTrades}>No trades yet</p>
            ) : (
              <div className={styles.tradesList}>
                {agentStatus.recentTrades.map((trade, idx) => (
                  <div key={idx} className={`${styles.tradeItem} ${trade.success ? styles.tradeSuccess : styles.tradeFailed}`}>
                    <div className={styles.tradeHeader}>
                      <span className={styles.tradeStatus}>
                        {trade.success ? "✅ Success" : "❌ Failed"}
                      </span>
                      <span className={styles.tradeTime}>
                        {new Date(trade.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {trade.success && (
                      <div className={styles.tradeDetails}>
                        <span>SOL Spent: {trade.solSpent?.toFixed(4)}</span>
                        <span>Tokens: {trade.tokensPurchased?.toFixed(2)}</span>
                        <a
                          href={`https://solscan.io/tx/${trade.signature}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.txLink}
                        >
                          View on Solscan
                        </a>
                      </div>
                    )}
                    {!trade.success && (
                      <div className={styles.tradeError}>
                        {trade.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
