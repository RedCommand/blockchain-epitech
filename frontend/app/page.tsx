'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAccount, useBalance, useReadContract } from 'wagmi';
import { parseAbi, formatEther } from 'viem';

const TOKEN_ABI = parseAbi([
  'function balanceOf(address account) external view returns (uint256)'
]);

const TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_MINERAL_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export default function Home() {
  const { address, isConnected } = useAccount();
  const { data: ethBalance } = useBalance({ address });
  const [goldPrice, setGoldPrice] = useState(0);
  const [ethPrice, setEthPrice] = useState(3000); // Default ETH price

  const { data: goldBalance, error: readError } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    }
  });

  // Fetch gold price every 30 sec
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/gold-price`);
        if (res.ok) {
          const data = await res.json();
          setGoldPrice(data.price || 0);
        }
      } catch (err) {
        console.error('Error fetching gold price:', err);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 30000);
    return () => clearInterval(interval);
  }, []);

  if (readError) {
    console.error("Read Contract Error:", readError);
  }

  const formattedGold = goldBalance ? formatEther(goldBalance) : '0';
  const ethValue = parseFloat(ethBalance?.formatted || '0') * ethPrice;
  const goldValue = parseFloat(formattedGold) * goldPrice;
  const portfolioValue = (ethValue + goldValue).toFixed(2);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">My Wallet</h2>
          {isConnected ? (
            <div>
              <p className="text-sm">Address: {address?.slice(0, 6)}...{address?.slice(-4)}</p>
              <p className="text-sm">ETH: {parseFloat(ethBalance?.formatted || '0').toFixed(4)} ({(ethValue).toFixed(2)} USD)</p>
              <p className="text-sm">GLD: {parseFloat(formattedGold).toFixed(4)} ({(goldValue).toFixed(2)} USD)</p>
              <div className="badge badge-success mt-2">Connected</div>
            </div>
          ) : (
            <div className="badge badge-warning">Not Connected</div>
          )}
        </div>
      </div>

      <div className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Portfolio Value</h2>
          <p className="text-3xl font-bold">${portfolioValue}</p>
          <div className="divider my-2"></div>
          <p className="text-xs">GLD: ${goldPrice.toFixed(2)}/g</p>
          <p className="text-xs">ETH: ${ethPrice.toFixed(2)}</p>
        </div>
      </div>

      <div className="card w-full col-span-1 md:col-span-2 bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">My Assets</h2>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Balance</th>
                  <th>Price</th>
                  <th>Value (USD)</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>ETH</td>
                  <td>{parseFloat(ethBalance?.formatted || '0').toFixed(4)}</td>
                  <td>${ethPrice.toFixed(2)}</td>
                  <td>${ethValue.toFixed(2)}</td>
                  <td><Link href="/trade" className="btn btn-xs btn-primary">Trade</Link></td>
                </tr>
                <tr>
                  <td>Gold (GLD)</td>
                  <td>{parseFloat(formattedGold).toFixed(4)}</td>
                  <td>${goldPrice.toFixed(2)}</td>
                  <td>${goldValue.toFixed(2)}</td>
                  <td><Link href="/trade" className="btn btn-xs btn-primary">Trade</Link></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
