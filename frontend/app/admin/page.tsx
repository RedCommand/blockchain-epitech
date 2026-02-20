'use client';
import { useState, useEffect } from 'react';
import { useWriteContract, useAccount, useReadContract } from 'wagmi';
import { parseAbi, parseEther } from 'viem';
import { useWaitForTransactionReceipt } from 'wagmi';
import config from '../contracts-config.json';

const REGISTRY_ABI = parseAbi([
  'function setWhitelist(address user, bool status) external',
  'function setBlacklist(address user, bool status) external',
  'function isWhitelisted(address user) external view returns (bool)',
  'function isBlacklisted(address user) external view returns (bool)',
  'function owner() external view returns (address)',
]);

const TOKEN_ABI = parseAbi([
  'function mint(address to, uint256 amount) external',
  'function balanceOf(address account) external view returns (uint256)',
]);

// Replace with deployed address
const REGISTRY_ADDRESS = (config.contracts.ComplianceRegistry || process.env.NEXT_PUBLIC_COMPLIANCE_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
const TOKEN_ADDRESS = (config.contracts.MineralToken || process.env.NEXT_PUBLIC_MINERAL_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;

export default function AdminPage() {
  const { address } = useAccount();
  const [kycAddress, setKycAddress] = useState('');
  const [mintAddress, setMintAddress] = useState('');
  const [mintAmount, setMintAmount] = useState('');
  const [message, setMessage] = useState('');
  
  const { writeContract, data: hash, isPending: isWriting, error: writeError } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ 
    hash,
    confirmations: 1,
  });

  // Check owner
  const { data: ownerAddress } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: 'owner',
  });

  const isOwner = address && ownerAddress && address.toLowerCase() === ownerAddress.toLowerCase();

  // Check whitelist status
  const { data: isWhitelisted, refetch: refetchWhitelist } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: 'isWhitelisted',
    args: kycAddress ? [kycAddress as `0x${string}`] : undefined,
    query: { enabled: !!kycAddress },
  });

  // Check blacklist status
  const { data: isBlacklisted, refetch: refetchBlacklist } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: 'isBlacklisted',
    args: kycAddress ? [kycAddress as `0x${string}`] : undefined,
    query: { enabled: !!kycAddress },
  });

  // Check token balance
  const { data: tokenBalance, refetch: refetchBalance } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: kycAddress ? [kycAddress as `0x${string}`] : undefined,
    query: { enabled: !!kycAddress },
  });

  useEffect(() => {
    if (isConfirmed) {
      setMessage('✅ Transaction Confirmed!');
      // Refetch status after confirmation
      refetchWhitelist();
      refetchBlacklist();
      refetchBalance();
      setTimeout(() => setMessage(''), 5000);
    }
  }, [isConfirmed, refetchWhitelist, refetchBlacklist, refetchBalance]);

  const handleWhitelist = (status: boolean) => {
    if (!kycAddress) {
      setMessage('❌ Enter an address');
      return;
    }
    writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: 'setWhitelist',
      args: [kycAddress as `0x${string}`, status],
    });
  };

  const handleBlacklist = (status: boolean) => {
    if (!kycAddress) {
      setMessage('❌ Enter an address');
      return;
    }
    writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: 'setBlacklist',
      args: [kycAddress as `0x${string}`, status],
    });
  };

  const handleMint = () => {
    if (!mintAddress || !mintAmount) {
      setMessage('❌ Enter address and amount');
      return;
    }
    console.log('Minting', mintAmount, 'tokens to', mintAddress);
    writeContract({
      address: TOKEN_ADDRESS,
      abi: TOKEN_ABI,
      functionName: 'mint',
      args: [mintAddress as `0x${string}`, parseEther(mintAmount)],
    });
  };

  const isPending = isWriting || isConfirming;
  const error = writeError;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>
      <p className="text-sm opacity-50 mb-4">Connected as: {address?.slice(0, 6)}...{address?.slice(-4)}</p>

      {!isOwner && address && (
        <div className="alert alert-warning mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <span>Warning: You are not the contract owner. You cannot perform admin actions. Please connect with the deployer account.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* KYC Management */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">KYC / Compliance</h2>
            <div className="form-control">
              <label className="label">
                <span className="label-text">User Address</span>
              </label>
              <input 
                type="text" 
                placeholder="0x..." 
                className="input input-bordered" 
                value={kycAddress}
                onChange={(e) => setKycAddress(e.target.value)}
              />
            </div>

            {/* Status Display */}
            {kycAddress && (
              <div className="bg-base-200 p-3 rounded mt-3 mb-3 space-y-2">
                <p className="text-sm font-semibold">Status:</p>
                <p className={`text-sm ${isWhitelisted ? 'text-success' : 'text-error'}`}>
                  ✓ Whitelisted: {isWhitelisted ? '✅ YES' : '❌ NO'}
                </p>
                <p className={`text-sm ${isBlacklisted ? 'text-error' : 'text-success'}`}>
                  ✓ Blacklisted: {isBlacklisted ? '❌ YES' : '✅ NO'}
                </p>
                {tokenBalance && (
                  <p className="text-sm">
                    ✓ GLD Balance: {(Number(tokenBalance) / 1e18).toFixed(2)}
                  </p>
                )}
              </div>
            )}

            <div className="card-actions justify-end mt-4 flex-col gap-2">
              <button 
                className="btn btn-success w-full" 
                onClick={() => handleWhitelist(true)}
                disabled={isPending || !isOwner}
              >
                Whitelist
              </button>
              <button 
                className="btn btn-warning w-full" 
                onClick={() => handleWhitelist(false)}
                disabled={isPending || !isOwner}
              >
                Revoke Whitelist
              </button>
              <button 
                className="btn btn-error w-full" 
                onClick={() => handleBlacklist(true)}
                disabled={isPending || !isOwner}
              >
                Blacklist
              </button>
            </div>
          </div>
        </div>

        {/* Minting */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Asset Minting (GLD)</h2>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Recipient Address</span>
              </label>
              <input 
                type="text" 
                placeholder="0x..." 
                className="input input-bordered" 
                value={mintAddress}
                onChange={(e) => setMintAddress(e.target.value)}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Amount (GLD units)</span>
              </label>
              <input 
                type="number" 
                placeholder="100" 
                className="input input-bordered" 
                value={mintAmount}
                onChange={(e) => setMintAmount(e.target.value)}
              />
              <label className="label">
                <span className="label-text-alt">Note: amounts are automatically converted to 18 decimals</span>
              </label>
            </div>
            <div className="card-actions justify-end mt-4">
              <button 
                className="btn btn-primary w-full" 
                onClick={handleMint}
                disabled={isPending || !mintAddress || !mintAmount}
              >
                {isPending ? 'Processing...' : 'Mint Assets'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {message && (
        <div className="toast toast-end">
          <div className={`alert ${message.includes('✅') ? 'alert-success' : 'alert-error'}`}>
            <span>{message}</span>
          </div>
        </div>
      )}
      
      {isConfirming && (
        <div className="toast toast-end">
          <div className="alert alert-info">
            <span>⏳ Transaction Sent. Waiting for confirmation...</span>
          </div>
        </div>
      )}

      {isConfirmed && (
        <div className="toast toast-end">
          <div className="alert alert-success">
            <span>✅ Transaction Confirmed!</span>
          </div>
        </div>
      )}
      
      {error && (
        <div className="toast toast-end z-50">
           <div className="alert alert-error">
            <span>❌ Error: {error.message.slice(0, 80)}...</span>
          </div>
        </div>
      )}
    </div>
  );
}
