import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createDAppKit, DAppKitProvider } from '@mysten/dapp-kit-react';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { VaultProvider } from '@evefrontier/dapp-kit';
import App from './App';
import { NetworkProvider } from './contexts/NetworkContext';
import './index.css';

/**
 * gRPC client for the dAppKit wallet/transaction layer.
 * Transaction building in @mysten/sui v2 requires gRPC.
 * Data queries use suiRpcClient (JSON-RPC) in hooks.
 */
const dAppKit = createDAppKit({
  networks: ['testnet'],
  createClient() {
    return new SuiGrpcClient({
      network: 'testnet',
      baseUrl: 'https://fullnode.testnet.sui.io:443',
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
