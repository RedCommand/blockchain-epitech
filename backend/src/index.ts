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
  db.run("CREATE TABLE IF NOT EXISTS swaps (id INTEGER PRIMARY KEY AUTOINCREMENT, user TEXT, token_in REAL, eth_in REAL, token_out REAL, eth_out REAL, direction TEXT, timestamp INTEGER)");
  db.run("CREATE TABLE IF NOT EXISTS pool_reserves (timestamp INTEGER PRIMARY KEY, eth_reserve REAL, token_reserve REAL)");
});

// Blockchain Client
const chain = process.env.CHAIN_ID === '1337' ? hardhat : sepolia;
const client = createPublicClient({
  chain: chain,
  transport: http(process.env.RPC_URL)
});

// Contract Addresses (from env)
const AMM_ADDRESS = process.env.NEXT_PUBLIC_AMM_ADDRESS as `0x${string}` || '0x0';
const TOKEN_ADDRESS = process.env.NEXT_PUBLIC_MINERAL_TOKEN_ADDRESS as `0x${string}` || '0x0';

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

app.get('/api/swaps', (req, res) => {
  db.all("SELECT * FROM swaps ORDER BY timestamp DESC LIMIT 50", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

app.get('/api/swaps/:address', (req, res) => {
  const { address } = req.params;
  db.all(
    "SELECT * FROM swaps WHERE user = ? ORDER BY timestamp DESC LIMIT 20",
    [address],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

app.get('/api/pool-reserves', (req, res) => {
  db.get(
    "SELECT * FROM pool_reserves ORDER BY timestamp DESC LIMIT 1",
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(row || { eth_reserve: 0, token_reserve: 0, timestamp: Date.now() });
    }
  );
});

// Start Server
app.listen(port, () => {
  console.log(`Indexer Backend running on http://localhost:${port}`);
});

// Event Listeners (Indexer)
if (AMM_ADDRESS !== '0x0' && TOKEN_ADDRESS !== '0x0') {
  console.log('Starting event indexer...');

  // Listen to SwapEthForToken events
  client.watchContractEvent({
    address: AMM_ADDRESS,
    abi: [parseAbiItem('event SwapEthForToken(address indexed user, uint256 ethIn, uint256 tokenOut)')],
    poll: true,
    onLogs: (logs: any[]) => {
      logs.forEach((log) => {
        const { user, ethIn, tokenOut } = log.args;
        db.run(
          "INSERT INTO swaps (user, eth_in, token_out, direction, timestamp) VALUES (?, ?, ?, ?, ?)",
          [user, Number(ethIn) / 1e18, Number(tokenOut) / 1e18, 'ETH_TO_TOKEN', Math.floor(Date.now() / 1000)],
          (err) => {
            if (err) console.error('Error inserting swap:', err);
            else console.log(`Recorded swap: ${user} swapped ETH for token`);
          }
        );
      });
    },
  });

  // Listen to SwapTokenForEth events
  client.watchContractEvent({
    address: AMM_ADDRESS,
    abi: [parseAbiItem('event SwapTokenForEth(address indexed user, uint256 tokenIn, uint256 ethOut)')],
    poll: true,
    onLogs: (logs: any[]) => {
      logs.forEach((log) => {
        const { user, tokenIn, ethOut } = log.args;
        db.run(
          "INSERT INTO swaps (user, token_in, eth_out, direction, timestamp) VALUES (?, ?, ?, ?, ?)",
          [user, Number(tokenIn) / 1e18, Number(ethOut) / 1e18, 'TOKEN_TO_ETH', Math.floor(Date.now() / 1000)],
          (err) => {
            if (err) console.error('Error inserting swap:', err);
            else console.log(`Recorded swap: ${user} swapped token for ETH`);
          }
        );
      });
    },
  });

  // Periodic pool reserves update (every 30 sec)
  setInterval(async () => {
    try {
      const ethBalance = await client.getBalance({ address: AMM_ADDRESS });
      const tokenBalance: any = await client.readContract({
        address: TOKEN_ADDRESS,
        abi: [parseAbiItem('function balanceOf(address account) external view returns (uint256)')],
        functionName: 'balanceOf',
        args: [AMM_ADDRESS],
      });

      const ethReserve = Number(ethBalance) / 1e18;
      const tokenReserve = Number(tokenBalance || 0) / 1e18;

      db.run(
        "INSERT INTO pool_reserves (eth_reserve, token_reserve, timestamp) VALUES (?, ?, ?)",
        [ethReserve, tokenReserve, Math.floor(Date.now() / 1000)],
        (err) => {
          if (err) console.error('Error updating pool reserves:', err);
          else console.log(`Pool reserves updated: ${ethReserve} ETH, ${tokenReserve} tokens`);
        }
      );
    } catch (err) {
      console.error('Error fetching pool reserves:', err);
    }
  }, 30000);

  console.log('Event listeners active.');
} else {
  console.warn('⚠️  Contract addresses not set. Indexer will not run.');
}
