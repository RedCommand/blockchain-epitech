'use client';

import { useState, useEffect } from 'react';
import { useAccount, useBalance, useReadContract, useWriteContract } from 'wagmi';
import { parseAbi, parseEther, formatEther } from 'viem';
import { useWaitForTransactionReceipt } from 'wagmi';

const AMM_ABI = parseAbi([
  'function swapEthForToken(uint256 minTokenOut) external payable returns (uint256)',
  'function swapTokenForEth(uint256 tokenIn, uint256 minEthOut) external returns (uint256)',
  'function addLiquidity(uint256 tokenAmount) external payable returns (uint256)'
]);

const TOKEN_ABI = parseAbi([
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)'
]);

const AMM_ADDRESS = (process.env.NEXT_PUBLIC_AMM_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
const TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_MINERAL_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
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
  const [ethIn, setEthIn] = useState('');
  const [tokenIn, setTokenIn] = useState('');
  const [minOut, setMinOut] = useState('0');
  const [swapHistory, setSwapHistory] = useState<SwapRecord[]>([]);
  const [poolReserves, setPoolReserves] = useState<PoolReserves | null>(null);

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

  const handleSwapEthForToken = () => {
    if (!ethIn) return;
    writeContract({
      address: AMM_ADDRESS,
      abi: AMM_ABI,
      functionName: 'swapEthForToken',
      args: [parseEther(minOut || '0')],
      value: parseEther(ethIn),
    });
  };

  const handleApproveToken = () => {
    if (!tokenIn) return;
    writeContract({
      address: TOKEN_ADDRESS,
      abi: TOKEN_ABI,
      functionName: 'approve',
      args: [AMM_ADDRESS, parseEther(tokenIn)],
    });
  };

  const handleSwapTokenForEth = () => {
    if (!tokenIn) return;
    writeContract({
      address: AMM_ADDRESS,
      abi: AMM_ABI,
      functionName: 'swapTokenForEth',
      args: [parseEther(tokenIn), parseEther(minOut || '0')],
    });
  };

  const formattedTokenBalance = tokenBalance ? formatEther(tokenBalance) : '0';
  const formattedTokenPool = tokenPool ? formatEther(tokenPool) : '0';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="card bg-base-100 shadow-xl lg:col-span-2">
        <div className="card-body">
          <h2 className="card-title">Swap ETH → Token</h2>
          <label className="form-control">
            <div className="label"><span className="label-text">ETH in</span></div>
            <input className="input input-bordered" value={ethIn} onChange={(e) => setEthIn(e.target.value)} placeholder="0.1" />
          </label>
          <label className="form-control">
            <div className="label"><span className="label-text">Min token out</span></div>
            <input className="input input-bordered" value={minOut} onChange={(e) => setMinOut(e.target.value)} placeholder="0" />
          </label>
          <button className="btn btn-primary" onClick={handleSwapEthForToken} disabled={!isConnected || isPending}>Swap</button>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-lg">Pool Status</h2>
          <p className="text-sm">ETH: {ethPool?.formatted || '0'}</p>
          <p className="text-sm">Token: {formattedTokenPool}</p>
          <p className="text-sm">My Tokens: {formattedTokenBalance}</p>
          {poolReserves && (
            <p className="text-xs opacity-50">
              Last updated: {new Date(poolReserves.timestamp * 1000).toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl lg:col-span-2">
        <div className="card-body">
          <h2 className="card-title">Swap Token → ETH</h2>
          <label className="form-control">
            <div className="label"><span className="label-text">Token in</span></div>
            <input className="input input-bordered" value={tokenIn} onChange={(e) => setTokenIn(e.target.value)} placeholder="10" />
          </label>
          <label className="form-control">
            <div className="label"><span className="label-text">Min ETH out</span></div>
            <input className="input input-bordered" value={minOut} onChange={(e) => setMinOut(e.target.value)} placeholder="0" />
          </label>
          <div className="flex gap-2">
            <button className="btn btn-outline" onClick={handleApproveToken} disabled={!isConnected || isPending}>Approve</button>
            <button className="btn btn-primary" onClick={handleSwapTokenForEth} disabled={!isConnected || isPending}>Swap</button>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-lg">Status</h2>
          {isConfirming && <div className="badge badge-warning">Confirming...</div>}
          {isSuccess && <div className="badge badge-success">Success!</div>}
          {!isConnected && <div className="badge badge-error">Disconnected</div>}
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
                    <td>{swap.direction}</td>
                    <td>{swap.eth_in || swap.token_in || 0}</td>
                    <td>{swap.eth_out || swap.token_out || 0}</td>
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
