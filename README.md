# Random Number Generator with Solana Payments

A Next.js application that gates random number generation behind Solana payments using the pump-fun tokenized agents SDK.

## Features

- ✅ Solana wallet integration (Phantom, Solflare)
- ✅ 0.1 SOL payment requirement
- ✅ Secure server-side payment verification
- ✅ Random number generation (0-1000)
- ✅ Transaction signing and confirmation
- ✅ Full error handling and user feedback
- ✅ Invoice retry logic with exponential backoff

## Prerequisites

- Node.js 18+ installed
- A pump.fun tokenized agent created with mint: `D1mpGfJmn278hLCFoqcjME3FDozL2q1EEaXG592Hpump`
- A Solana wallet (Phantom, Solflare, or compatible)

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/Ourcoincrypto/random-number-generator-solana.git
cd random-number-generator-solana
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

The `.env.local` file is pre-configured with:
- Agent Token Mint: `D1mpGfJmn278hLCFoqcjME3FDozL2q1EEaXG592Hpump`
- Currency: Wrapped SOL
- Price: 0.1 SOL (100,000,000 lamports)
- RPC: `https://rpc.solanatracker.io/public`

### 4. Start development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

### Payment Flow

1. **Connect Wallet** — User connects their Solana wallet
2. **Request Payment** — Click "Pay & Generate Random Number"
3. **Build Transaction** — Server builds a payment instruction
4. **Sign Transaction** — User approves in their wallet
5. **Send Transaction** — Transaction is submitted on-chain
6. **Verify Payment** — Server verifies the payment on-chain (with retries)
7. **Generate Number** — Upon successful verification, random number is generated
8. **Display Result** — User sees their random number

### API Endpoints

#### POST `/api/generate-payment`
Builds a payment transaction for the user.

**Request:**
```json
{
  "userWallet": "<user-public-key>"
}
```

**Response:**
```json
{
  "success": true,
  "transaction": "<base64-serialized-tx>",
  "invoiceParams": {
    "amount": 100000000,
    "memo": 123456789,
    "startTime": 1700000000,
    "endTime": 1700086400
  }
}
```

#### POST `/api/verify-payment`
Verifies that a payment was confirmed on-chain.

**Request:**
```json
{
  "userWallet": "<user-public-key>",
  "amount": 100000000,
  "memo": 123456789,
  "startTime": 1700000000,
  "endTime": 1700086400
}
```

**Response:**
```json
{
  "success": true,
  "verified": true
}
```

#### POST `/api/generate-random`
Generates a random number (0-1000) for verified payments.

**Request:**
```json
{
  "verified": true
}
```

**Response:**
```json
{
  "success": true,
  "randomNumber": 427
}
```

## Deployment

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Set environment variables in Vercel dashboard:
- `SOLANA_RPC_URL`
- `NEXT_PUBLIC_SOLANA_RPC_URL`
- `AGENT_TOKEN_MINT_ADDRESS`
- `CURRENCY_MINT`
- `PRICE_AMOUNT`

## Project Structure

```
src/
├── lib/
│   └── solana.ts          # Solana configuration & helpers
├── pages/
│   ├── api/
│   │   ├── generate-payment.ts  # Build payment transaction
│   │   ├── verify-payment.ts    # Verify payment on-chain
│   │   └── generate-random.ts   # Generate random number
│   ├── _app.tsx           # Wallet provider setup
│   └── index.tsx          # Main UI
└── styles/
    ├── globals.css        # Global styles
    └── Home.module.css    # Component styles
```

## Security

- ✅ Payment verification always happens server-side
- ✅ Private keys never exposed or logged
- ✅ Transaction signing done client-side only
- ✅ Invoice parameters validated on verification
- ✅ Retry logic with exponential backoff for reliability

## Troubleshooting

### Transaction fails with "compute exceeded"
Increase `computeUnitLimit` in `/api/generate-payment.ts`:

```typescript
const instructions = await agent.buildAcceptPaymentInstructions({
  // ... other params
  computeUnitLimit: 200_000, // increased from 100_000
});
```

### Payment verification fails
- Check that the transaction confirmed on-chain
- Verify the RPC endpoint is working
- Wait a few seconds for indexing and retry

### Wallet not connecting
- Make sure you have Phantom or Solflare installed
- Try refreshing the page
- Check browser console for errors

## References

- [pump-fun/pump-fun-skills - Tokenized Agents](https://github.com/pump-fun/pump-fun-skills)
- [Solana Web3.js Documentation](https://solana-labs.github.io/solana-web3.js/)
- [Solana Wallet Adapter](https://github.com/solana-labs/wallet-adapter)
- [Next.js Documentation](https://nextjs.org/docs)

## License

MIT
