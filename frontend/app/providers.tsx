'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { getDefaultWallets, getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  arbitrum,
  base,
  mainnet,
  optimism,
  polygon,
  sepolia,
  hardhat,
} from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, http } from 'wagmi';
import '@rainbow-me/rainbowkit/styles.css';
import contractsConfig from './contracts-config.json';

const { wallets } = getDefaultWallets();

// Determine which chain to use based on config
const configuredChainId = contractsConfig.chainId;
const supportedChains = [];
if (configuredChainId === 11155111) {
  supportedChains.push(sepolia);
} else {
  supportedChains.push(hardhat);
}

const config = getDefaultConfig({
  appName: 'Tokenized Assets',
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID || 'YOUR_PROJECT_ID',
  // Note: Additional wallets (Trust, Ledger) removed due to SSR issues.
  // Add them back using connectorsForWallets if needed.
  chains: supportedChains as any,
  transports: {
    [sepolia.id]: http(),
    [hardhat.id]: http('http://127.0.0.1:8545'),
  },
  ssr: true,
});

const queryClient = new QueryClient();

const RainbowKitProvider = dynamic(
  () => import('@rainbow-me/rainbowkit').then((mod) => mod.RainbowKitProvider),
  { ssr: false }
);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
