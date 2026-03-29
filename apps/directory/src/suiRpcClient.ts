import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';

/**
 * JSON-RPC client for read queries (getOwnedObjects, etc.).
 * Transactions use the dAppKit gRPC client from main.tsx.
 */
export const suiRpcClient = new SuiJsonRpcClient({
  network: 'testnet',
  url: (import.meta.env.VITE_RPC_URL as string) ?? getJsonRpcFullnodeUrl('testnet'),
});
