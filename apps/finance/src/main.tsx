import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createDAppKit, DAppKitProvider } from '@mysten/dapp-kit-react';
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
import { VaultProvider } from '@evefrontier/dapp-kit';
import App from './App';
import { NetworkProvider } from './contexts/NetworkContext';
import './index.css';

const dAppKit = createDAppKit({
  networks: ['testnet'],
  createClient() {
    return new SuiJsonRpcClient({
      network: 'testnet',
      url: import.meta.env.VITE_RPC_URL ?? getJsonRpcFullnodeUrl('testnet'),
    });
  },
});

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <DAppKitProvider dAppKit={dAppKit}>
        <VaultProvider>
          <NetworkProvider>
            <App />
          </NetworkProvider>
        </VaultProvider>
      </DAppKitProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
