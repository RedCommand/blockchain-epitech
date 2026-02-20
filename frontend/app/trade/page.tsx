'use client';

import { useState, useEffect } from 'react';
import { useAccount, useBalance, useReadContract, useWriteContract } from 'wagmi';
import { parseAbi, parseEther, formatEther } from 'viem';
import { useWaitForTransactionReceipt } from 'wagmi';
import config from '../contracts-config.json';

const AMM_ABI = parseAbi([
  'function swapEthForToken(uint256 minTokenOut) external payable returns (uint256)',
  'function swapTokenForEth(uint256 tokenIn, uint256 minEthOut) external returns (uint256)',
  'function addLiquidity(uint256 tokenAmount) external payable returns (uint256)'
]);

const TOKEN_ABI = parseAbi([
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)'
]);

const AMM_ADDRESS = (config.contracts.SimpleAMM || process.env.NEXT_PUBLIC_AMM_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
const TOKEN_ADDRESS = (config.contracts.MineralToken || process.env.NEXT_PUBLIC_MINERAL_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface SwapRecord {
  id: number;
  user: string;
  eth_in: number;
  token_in: number;
  eth_out: number;
  token_out: number;
  direction: string;
  timestamp: number;
}

interface PoolReserves {
  eth_reserve: number;
  token_reserve: number;
  timestamp: number;
}

export default function TradePage() {
  const { address, isConnected } = useAccount();
  const [direction, setDirection] = useState<'ethToToken' | 'tokenToEth'>('ethToToken');
  const [amountIn, setAmountIn] = useState('');
  const [debouncedAmountIn, setDebouncedAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');
  const [minOut, setMinOut] = useState('0');
  const [poolEmpty, setPoolEmpty] = useState(false);
  const [swapHistory, setSwapHistory] = useState<SwapRecord[]>([]);
  const [poolReserves, setPoolReserves] = useState<PoolReserves | null>(null);
  const [ethPrice, setEthPrice] = useState(0);
  const [goldPrice, setGoldPrice] = useState(0);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const { data: tokenBalance } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: ethPool } = useBalance({ address: AMM_ADDRESS });
  const { data: tokenPool } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: [AMM_ADDRESS],
  });

  // Fetch swap history every 10 sec
  useEffect(() => {
    const fetchSwapHistory = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/swaps`);
        if (res.ok) {
          const data = await res.json();
          setSwapHistory(data);
        }
      } catch (err) {
        console.error('Error fetching swap history:', err);
      }
    };

    fetchSwapHistory();
    const interval = setInterval(fetchSwapHistory, 10000);
    return () => clearInterval(interval);
  }, []);

  // Debounce input to avoid recalculating on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAmountIn(amountIn);
    }, 350);

    return () => clearTimeout(timer);
  }, [amountIn]);

  // Fetch pool reserves every 15 sec
  useEffect(() => {
    const fetchPoolReserves = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/pool-reserves`);
        if (res.ok) {
          const data = await res.json();
          setPoolReserves(data);
        }
      } catch (err) {
        console.error('Error fetching pool reserves:', err);
      }
    };

    fetchPoolReserves();
    const interval = setInterval(fetchPoolReserves, 15000);
    return () => clearInterval(interval);
  }, []);

  // Fetch prices every 30 sec
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const goldCandidates = [
          `${BACKEND_URL}/api/gold-price`,
          'http://localhost:3001/api/gold-price',
          'http://127.0.0.1:3001/api/gold-price',
        ];
        for (const url of goldCandidates) {
          try {
            const goldRes = await fetch(url, { cache: 'no-store' });
            if (!goldRes.ok) continue;
            const data = await goldRes.json();
            setGoldPrice(data.price || 0);
            break;
          } catch {
            // try next candidate
          }
        }

        const ethCandidates = [
          `${BACKEND_URL}/api/eth-price`,
          'http://localhost:3001/api/eth-price',
          'http://127.0.0.1:3001/api/eth-price',
        ];
        for (const url of ethCandidates) {
          try {
            const ethRes = await fetch(url, { cache: 'no-store' });
            if (!ethRes.ok) continue;
            const data = await ethRes.json();
            setEthPrice(data.price || 3000);
            break;
          } catch {
            // try next candidate
          }
        }
      } catch (err) {
        console.error('Error fetching prices:', err);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  // Calculate output amount when input changes
  useEffect(() => {
    if (!debouncedAmountIn || !poolReserves) {
      setAmountOut('');
      setMinOut('0');
      setPoolEmpty(false);
      return;
    }

    const inAmount = parseFloat(debouncedAmountIn);
    const ethReserve = poolReserves.eth_reserve;
    const tokenReserve = poolReserves.token_reserve;
    const fee = 0.003; // 0.3% fee

    if (!isFinite(inAmount) || inAmount <= 0 || ethReserve <= 0 || tokenReserve <= 0) {
      setAmountOut('');
      setMinOut('0');
      setPoolEmpty(true);
      return;
    }

    let output = 0;
    if (direction === 'ethToToken') {
      // ETH -> Token: amountOut = (inAmount * (1-fee) * tokenReserve) / (ethReserve + inAmount * (1-fee))
      const amountInWithFee = inAmount * (1 - fee);
      output = (amountInWithFee * tokenReserve) / (ethReserve + amountInWithFee);
    } else {
      // Token -> ETH: amountOut = (inAmount * (1-fee) * ethReserve) / (tokenReserve + inAmount * (1-fee))
      const amountInWithFee = inAmount * (1 - fee);
      output = (amountInWithFee * ethReserve) / (tokenReserve + amountInWithFee);
    }

    setAmountOut(output.toFixed(6));
    setMinOut((output * 0.95).toFixed(6)); // 5% slippage
    setPoolEmpty(false);
  }, [debouncedAmountIn, direction, poolReserves]);

  const handleSwap = () => {
    if (!amountIn || poolEmpty) return;

    if (direction === 'ethToToken') {
      writeContract({
        address: AMM_ADDRESS,
        abi: AMM_ABI,
        functionName: 'swapEthForToken',
        args: [parseEther(minOut || '0')],
        value: parseEther(amountIn),
      });
    } else {
      // Token -> ETH requires approval first
      writeContract({
        address: AMM_ADDRESS,
        abi: AMM_ABI,
        functionName: 'swapTokenForEth',
        args: [parseEther(amountIn), parseEther(minOut || '0')],
      });
    }
  };

  const handleApprove = () => {
    if (!amountIn) return;
    writeContract({
      address: TOKEN_ADDRESS,
      abi: TOKEN_ABI,
      functionName: 'approve',
      args: [AMM_ADDRESS, parseEther(amountIn)],
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="card bg-base-100 shadow-xl lg:col-span-2">
        <div className="card-body">
          <h2 className="card-title">Swap</h2>
          
          {/* Direction Selector */}
          <div className="form-control">
            <label className="label"><span className="label-text">Swap Direction</span></label>
            <select 
              className="select select-bordered" 
              value={direction}
              onChange={(e) => {
                setDirection(e.target.value as 'ethToToken' | 'tokenToEth');
                setAmountIn('');
                setAmountOut('');
              }}
            >
              <option value="ethToToken">ETH → GLD</option>
              <option value="tokenToEth">GLD → ETH</option>
            </select>
          </div>

          {/* Amount In */}
          <label className="form-control mt-4">
            <div className="label">
              <span className="label-text">
                {direction === 'ethToToken' ? 'ETH' : 'GLD'} to send
              </span>
            </div>
            <input 
              className="input input-bordered text-lg" 
              value={amountIn} 
              onChange={(e) => setAmountIn(e.target.value)} 
              placeholder="Enter amount"
              type="number"
              step="0.01"
            />
            <div className="label">
              <span className="label-text-alt">
                Value: ${direction === 'ethToToken' 
                  ? (parseFloat(amountIn || '0') * ethPrice).toFixed(2)
                  : (parseFloat(amountIn || '0') * goldPrice).toFixed(2)
                }
              </span>
            </div>
          </label>

          {/* Arrow */}
          <div className="flex justify-center py-2">
            <div className="text-2xl">⬇</div>
          </div>

          {/* Amount Out (Auto-filled) */}
          <label className="form-control">
            <div className="label">
              <span className="label-text">
                {direction === 'ethToToken' ? 'GLD' : 'ETH'} to receive
              </span>
            </div>
            <input 
              className="input input-bordered text-lg font-bold" 
              value={amountOut} 
              readOnly
              placeholder="Calculating..."
              type="number"
            />
            <div className="label">
              <span className="label-text-alt">
                Min received (5% slippage): {amountOut ? amountOut : '0'}
              </span>
            </div>
          </label>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-6">
            {direction === 'tokenToEth' && (
              <button 
                className="btn btn-outline flex-1" 
                onClick={handleApprove} 
                disabled={!isConnected || !amountIn || isPending || poolEmpty}
              >
                Approve
              </button>
            )}
            <button 
              className={`btn ${direction === 'ethToToken' ? 'btn-primary' : 'btn-success'} flex-1`}
              onClick={handleSwap} 
              disabled={!isConnected || !amountIn || isPending || poolEmpty}
            >
              {isPending ? 'Processing...' : 'Swap Now'}
            </button>
          </div>

          {poolEmpty && (
            <div className="alert alert-warning mt-4">
              <span>Pool vide ou réserves indisponibles. Ajoute d'abord de la liquidité.</span>
            </div>
          )}

          {/* Status Messages */}
          {isConfirming && (
            <div className="alert alert-info mt-4">
              <span>⏳ Waiting for confirmation...</span>
            </div>
          )}
          {isSuccess && (
            <div className="alert alert-success mt-4">
              <span>✅ Swap confirmed!</span>
            </div>
          )}
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-lg">Pool Status</h2>
          <p className="text-sm">ETH: {ethPool?.formatted || '0'}</p>
          <p className="text-sm">Token: {formatEther(tokenPool ? BigInt(tokenPool.toString()) : 0n)}</p>
          <p className="text-sm font-bold mt-2">My Tokens: {formatEther(tokenBalance ? BigInt(tokenBalance.toString()) : 0n)}</p>
          <div className="divider my-1"></div>
          <p className="text-xs font-bold">Real-time Prices:</p>
          <p className="text-xs">GLD: ${goldPrice.toFixed(2)}/g</p>
          <p className="text-xs">ETH: ${ethPrice.toFixed(2)}</p>
          {poolReserves && (
            <p className="text-xs opacity-50 mt-1">
              Updated: {new Date(poolReserves.timestamp * 1000).toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl lg:col-span-3">
        <div className="card-body">
          <h2 className="card-title">Recent Swaps</h2>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Direction</th>
                  <th>Amount In</th>
                  <th>Amount Out</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {swapHistory.slice(0, 10).map((swap) => (
                  <tr key={swap.id}>
                    <td>{swap.user.slice(0, 6)}...{swap.user.slice(-4)}</td>
                    <td><span className="badge badge-sm">{swap.direction}</span></td>
                    <td>{(swap.eth_in || swap.token_in || 0).toFixed(4)}</td>
                    <td>{(swap.eth_out || swap.token_out || 0).toFixed(4)}</td>
                    <td>{new Date(swap.timestamp * 1000).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {swapHistory.length === 0 && <p className="text-center opacity-50">No swaps yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
