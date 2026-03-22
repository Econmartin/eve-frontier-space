import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';

/**
 * JSON-RPC client for data queries (getCoins, getOwnedObjects, queryTransactionBlocks, etc.).
 * The dAppKit uses SuiGrpcClient internally for transaction building/execution — this
 * client is only for read operations.
 */
export const suiRpcClient = new SuiJsonRpcClient({
  network: 'testnet',
  url: (import.meta.env.VITE_RPC_URL as string) ?? getJsonRpcFullnodeUrl('testnet'),
});
