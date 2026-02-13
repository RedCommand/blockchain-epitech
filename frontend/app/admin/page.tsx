'use client';
import { useState } from 'react';
import { useWriteContract } from 'wagmi';
import { parseAbi, parseEther } from 'viem';
import { useWaitForTransactionReceipt } from 'wagmi';

const REGISTRY_ABI = parseAbi([
  'function setWhitelist(address user, bool status) external',
  'function setBlacklist(address user, bool status) external',
  'function mint(address to, uint256 amount) external', // For MineralToken
]);

// Replace with deployed address
const REGISTRY_ADDRESS = (process.env.NEXT_PUBLIC_COMPLIANCE_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
const TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_MINERAL_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;

export default function AdminPage() {
  const [kycAddress, setKycAddress] = useState('');
  const [mintAddress, setMintAddress] = useState('');
  const [mintAmount, setMintAmount] = useState('');
  
  const { writeContract, data: hash, isPending: isWriting, error: writeError } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ 
    hash,
  });

  const handleWhitelist = (status: boolean) => {
    writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: 'setWhitelist',
      args: [kycAddress as `0x${string}`, status],
    });
  };

  const handleBlacklist = (status: boolean) => {
    writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: 'setBlacklist',
      args: [kycAddress as `0x${string}`, status],
    });
  };

  const handleMint = () => {
    writeContract({
      address: TOKEN_ADDRESS,
      abi: REGISTRY_ABI, // Using same ABI array for simplicity
      functionName: 'mint',
      args: [mintAddress as `0x${string}`, parseEther(mintAmount)],
    });
  };

  const isPending = isWriting || isConfirming;
  const error = writeError;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>

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
            <div className="card-actions justify-end mt-4">
              <button 
                className="btn btn-success" 
                onClick={() => handleWhitelist(true)}
                disabled={isPending}
              >
                Whitelist
              </button>
              <button 
                className="btn btn-warning" 
                onClick={() => handleWhitelist(false)}
                disabled={isPending}
              >
                Revoke Whitelist
              </button>
              <button 
                className="btn btn-error" 
                onClick={() => handleBlacklist(true)}
                disabled={isPending}
              >
                Blacklist
              </button>
            </div>
          </div>
        </div>

        {/* Minting */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Asset Minting</h2>
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
                <span className="label-text">Amount (Units)</span>
              </label>
              <input 
                type="number" 
                placeholder="100" 
                className="input input-bordered" 
                value={mintAmount}
                onChange={(e) => setMintAmount(e.target.value)}
              />
            </div>
            <div className="card-actions justify-end mt-4">
              <button 
                className="btn btn-primary" 
                onClick={handleMint}
                disabled={isPending}
              >
                Mint Assets
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {isConfirming && (
        <div className="toast toast-end">
          <div className="alert alert-info">
            <span>Transaction Sent. Waiting for confirmation...</span>
          </div>
        </div>
      )}

      {isConfirmed && (
        <div className="toast toast-end">
          <div className="alert alert-success">
            <span>Transaction Confirmed! Block updated.</span>
          </div>
        </div>
      )}
      
      {error && (
        <div className="toast toast-end z-50">
           <div className="alert alert-error">
            <span>Error: {error.message.slice(0, 100)}...</span>
          </div>
        </div>
      )}
    </div>
  );
}
