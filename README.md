# Tokenized Asset Management Platform (RWA)

A full-stack platform for tokenizing Real-World Assets (Gold, Silver, Diamonds) on EVM-compatible blockchains.

## Features
- **Tokenization:**
  - Gold/Silver (ERC-20 Fungible Tokens).
  - Diamonds (ERC-721 Non-Fungible Tokens).
- **Compliance:**
  - On-chain KYC Registry (Whitelist/Blacklist).
  - Compliance checks enforced on every token transfer.
- **DEX Integration:**
  - Integrated trading interface (Uniswap compatible).
- **Indexer:**
  - Real-time event indexing for portfolio updates.

## Architecture
- **Contracts:** Hardhat + Solidity + OpenZeppelin.
- **Backend:** Node.js + Express + Viem + SQLite.
- **Frontend:** Next.js 16 + Tailwind CSS + DaisyUI + RainbowKit + Wagmi.

## Prerequisites
- Node.js v20+
- MetaMask Wallet

## Getting Started

### 1. Installation
Install dependencies for all workspaces:
```bash
npm install
```

### 2. Smart Contracts
Compile and test contracts:
```bash
cd contracts
npm install
npx hardhat compile
npx hardhat test
```

### 3. Backend (Indexer)
Start the backend service:
```bash
cd backend
npm install
npm run dev
```
The backend runs on http://localhost:3001.

### 4. Frontend (UI)
Start the web application:
```bash
cd frontend
npm install
npm run dev
```
The frontend runs on http://localhost:3000.

## Project Structure
- `contracts/`: Solidity smart contracts and deployment scripts.
- `backend/`: Off-chain indexer and API.
- `frontend/`: User interface and admin panel.

## Deployment
1. Configure `.env` in `contracts/` with `SEPOLIA_RPC_URL` and `PRIVATE_KEY`.
2. Run `npx hardhat run scripts/deploy.ts --network sepolia` (Script needs to be created).
3. Update `frontend/app/admin/page.tsx` with deployed addresses.

## License
MIT
