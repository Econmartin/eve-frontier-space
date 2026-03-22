import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SuiClientProvider, WalletProvider, createNetworkConfig } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import App from './App';
import { NetworkProvider } from './contexts/NetworkContext';
import './index.css';

const { networkConfig } = createNetworkConfig({
  utopia: { url: import.meta.env.VITE_RPC_URL ?? getFullnodeUrl('testnet') },
});

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="utopia">
        <WalletProvider autoConnect>
          <NetworkProvider>
            <App />
          </NetworkProvider>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
