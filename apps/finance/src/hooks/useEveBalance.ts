import { useSuiClientQuery, useCurrentAccount } from '@mysten/dapp-kit';
import { useNetwork } from '../contexts/NetworkContext';
import { EVE_SCALE } from '../constants';

export interface EveBalance {
  coins:            Array<{ coinObjectId: string; balance: string }>;
  totalBalance:     bigint;
  formattedBalance: string;
  largestCoinId:    string | null;
  isLoading:        boolean;
  error:            Error | null;
}

export function useEveBalance(): EveBalance {
  const account = useCurrentAccount();
  const { network } = useNetwork();

  const { data, isPending, error } = useSuiClientQuery(
    'getCoins',
    { owner: account?.address ?? '', coinType: network.eveCoinType },
    { enabled: !!account?.address },
  );

  const coins = data?.data ?? [];
  const totalBalance = coins.reduce((sum, c) => sum + BigInt(c.balance), 0n);

  const formattedBalance = (Number(totalBalance) / Number(EVE_SCALE)).toLocaleString(
    undefined,
    { maximumFractionDigits: 4 },
  );

  const largestCoin = coins.reduce<(typeof coins)[0] | null>((best, c) => {
    if (!best) return c;
    return BigInt(c.balance) > BigInt(best.balance) ? c : best;
  }, null);

  return {
    coins,
    totalBalance,
    formattedBalance,
    largestCoinId: largestCoin?.coinObjectId ?? null,
    isLoading: isPending,
    error: error as Error | null,
  };
}
