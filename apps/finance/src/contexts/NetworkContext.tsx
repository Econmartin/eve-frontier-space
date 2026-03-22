import { createContext, useContext, useState, type ReactNode } from 'react';
import { NETWORKS, DEFAULT_NETWORK, type NetworkId, type NetworkConfig } from '../constants';

interface NetworkContextValue {
  networkId:     NetworkId;
  network:       NetworkConfig;
  setNetworkId:  (id: NetworkId) => void;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [networkId, setNetworkId] = useState<NetworkId>(DEFAULT_NETWORK);

  return (
    <NetworkContext.Provider
      value={{ networkId, network: NETWORKS[networkId], setNetworkId }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork(): NetworkContextValue {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error('useNetwork must be used inside <NetworkProvider>');
  return ctx;
}
