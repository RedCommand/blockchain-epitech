'use client';
import { useAccount, useBalance, useReadContract } from 'wagmi';
import { parseAbi, formatEther } from 'viem';

const TOKEN_ABI = parseAbi([
  'function balanceOf(address account) external view returns (uint256)'
]);

const TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_MINERAL_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;

export default function Home() {
  const { address, isConnected } = useAccount();
  const { data: ethBalance } = useBalance({ address });

  const { data: goldBalance, error: readError } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    }
  });

  if (readError) {
    console.error("Read Contract Error:", readError);
  }

  const formattedGold = goldBalance ? formatEther(goldBalance) : '0';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">My Wallet</h2>
          {isConnected ? (
            <div>
              <p>Address: {address?.slice(0, 6)}...{address?.slice(-4)}</p>
              <p>ETH Balance: {ethBalance?.formatted} {ethBalance?.symbol}</p>
              <div className="badge badge-success">Connected</div>
            </div>
          ) : (
            <div className="badge badge-warning">Not Connected</div>
          )}
        </div>
      </div>

      <div className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Portfolio Value</h2>
          <p className="text-2xl font-bold">$0.00</p>
          <p className="text-sm opacity-50">Based on Oracle Prices</p>
        </div>
      </div>

      <div className="card w-full col-span-1 md:col-span-2 bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">My Assets</h2>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Balance</th>
                  <th>Value (USD)</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Gold (GLD)</td>
                  <td>{formattedGold}</td>
                  <td>$0.00</td>
                  <td><button className="btn btn-xs btn-primary">Trade</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
