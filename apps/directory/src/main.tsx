/**
 * App entry point for /directory.
 * Provider stack: QueryClient → DAppKit (Sui testnet gRPC) → Vault → Router
 * Routes: / → DirectoryPage, /view → ViewPage (iframe wrapper)
 * basename: '/directory' so React Router matches under the /directory subpath.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createDAppKit, DAppKitProvider } from '@mysten/dapp-kit-react';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { VaultProvider } from '@evefrontier/dapp-kit';
import { DirectoryPage, ViewPage } from '@/components/pages';
import './index.css';

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

const router = createBrowserRouter([
  { path: '/', element: <DirectoryPage /> },
  { path: '/view', element: <ViewPage /> },
], { basename: '/directory' });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <DAppKitProvider dAppKit={dAppKit}>
        <VaultProvider>
          <RouterProvider router={router} />
        </VaultProvider>
      </DAppKitProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
