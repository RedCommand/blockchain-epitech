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
let lastPoolErrorLog = 0;

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
const ORACLE_ADDRESS = process.env.NEXT_PUBLIC_ORACLE_ADDRESS as `0x${string}` || '0x0';

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

app.get('/api/gold-price', async (req, res) => {
  try {
    let goldPrice = 0;
    let source = 'Unknown';

    // Fetch real-time gold price from Gold API
    try {
      const goldResponse = await fetch(
        'https://api.gold-api.com/price/XAU'
      );
      
      if (goldResponse.ok) {
        const goldData: any = await goldResponse.json();
        // API returns price in various currencies, default to USD per troy ounce
        goldPrice = goldData.price || 0;
        source = `Gold API (XAU) - ${goldData.currency || 'USD'}/oz`;
        
        console.log(`Gold price fetched: $${goldPrice} ${goldData.currency || 'USD'}/oz`);
      } else {
        throw new Error('Gold API returned non-ok status');
      }
    } catch (err) {
      console.warn('Gold API failed, trying fallback:', err);
      
      // Fallback to environment variable
      const envPrice = process.env.GOLD_PRICE_USD;
      if (envPrice) {
        goldPrice = parseFloat(envPrice);
        source = 'Environment Config';
      } else {
        // Default fallback price
        goldPrice = 2000; // Per troy ounce
        source = 'Default Fallback';
      }
    }

    // Optional: Also get from oracle if available
    let oraclePrice = 0;
    if (ORACLE_ADDRESS !== '0x0') {
      try {
        const priceBytes32 = '0x474f4c4400000000000000000000000000000000000000000000000000000000';
        const oraclePriceResult = await client.readContract({
          address: ORACLE_ADDRESS,
          abi: [parseAbiItem('function getPrice(bytes32 assetId) external view returns (uint256)')],
          functionName: 'getPrice',
          args: [priceBytes32],
        });
        oraclePrice = Number(oraclePriceResult || 0) / 1e18;
      } catch (err) {
        console.warn('Could not fetch oracle price');
      }
    }

    res.json({ 
      price: goldPrice, 
      symbol: 'XAU',
      unit: 'USD per troy ounce',
      source: source,
      oraclePrice: oraclePrice > 0 ? oraclePrice : undefined,
      timestamp: Math.floor(Date.now() / 1000)
    });
  } catch (err) {
    console.error('Error fetching gold price:', err);
    // Return a default price instead of error
    res.json({ 
      error: 'Failed to fetch real-time price, using default',
      price: 2000, 
      symbol: 'XAU',
      unit: 'USD per troy ounce',
      source: 'Default',
      timestamp: Math.floor(Date.now() / 1000)
    });
  }
});

app.get('/api/eth-price', async (req, res) => {
  try {
    let ethPrice = 3000;
    let source = 'Default Fallback';

    // Try environment variable first
    if (process.env.ETH_PRICE_USD) {
      ethPrice = parseFloat(process.env.ETH_PRICE_USD);
      source = 'Environment Config';
    }

    res.json({ 
      price: ethPrice,
      symbol: 'ETH',
      unit: 'USD',
      source: source,
      timestamp: Math.floor(Date.now() / 1000)
    });
  } catch (err) {
    console.error('Error in ETH price endpoint:', err);
    res.json({ 
      price: 3000, 
      symbol: 'ETH',
      unit: 'USD',
      source: 'Default Fallback',
      timestamp: Math.floor(Date.now() / 1000)
    });
  }
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
      const now = Date.now();
      if (now - lastPoolErrorLog > 60000) {
        console.error('Error fetching pool reserves:', err);
        lastPoolErrorLog = now;
      }
    }
  }, 30000);

  console.log('Event listeners active.');
} else {
  console.warn('⚠️  Contract addresses not set. Indexer will not run.');
}
