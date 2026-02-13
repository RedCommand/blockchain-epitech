import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sqlite3 from 'sqlite3';
const { Database } = sqlite3.verbose();
import { createPublicClient, http, parseAbiItem } from 'viem';
import { sepolia, hardhat } from 'viem/chains';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Database Setup
const db = new Database(':memory:'); // Use file-based DB in production
db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS users (address TEXT PRIMARY KEY, is_whitelisted INTEGER, is_blacklisted INTEGER)");
  db.run("CREATE TABLE IF NOT EXISTS balances (address TEXT, token TEXT, balance REAL, PRIMARY KEY (address, token))");
  db.run("CREATE TABLE IF NOT EXISTS prices (asset TEXT PRIMARY KEY, price REAL, timestamp INTEGER)");
});

// Blockchain Client
const chain = process.env.CHAIN_ID === '1337' ? hardhat : sepolia;
const client = createPublicClient({
  chain: chain,
  transport: http(process.env.RPC_URL)
});

// Routes
app.get('/api/users/:address', (req, res) => {
  const { address } = req.params;
  db.get("SELECT * FROM users WHERE address = ?", [address], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row || { address, is_whitelisted: 0, is_blacklisted: 0 });
  });
});

app.get('/api/portfolio/:address', (req, res) => {
  const { address } = req.params;
  db.all("SELECT * FROM balances WHERE address = ?", [address], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/prices', (req, res) => {
  db.all("SELECT * FROM prices", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Start Server
app.listen(port, () => {
  console.log(`Indexer Backend running on http://localhost:${port}`);
});

// TODO: Implement Event Listeners once contracts are deployed and addresses are known.
// Example:
// client.watchContractEvent({
//   address: CONTRACT_ADDRESS,
//   abi: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
//   onLogs: logs => { ... }
// });
