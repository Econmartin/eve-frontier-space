import { useQuery } from '@tanstack/react-query';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { suiRpcClient } from '../suiRpcClient';

const SUI_COIN_TYPE = '0x2::sui::SUI';

/** Below 0.1 SUI — warn the user to request testnet gas */
const GAS_LOW_THRESHOLD = 100_000_000n;

export function useSuiBalance() {
  const account = useCurrentAccount();

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['suiBalance', account?.address],
    queryFn: () => suiRpcClient.getBalance({ owner: account!.address, coinType: SUI_COIN_TYPE }),
    enabled: !!account?.address,
  });

  const balance = BigInt(data?.totalBalance ?? '0');
  const known = !isPending && !isError;

  return {
    balance,
    isLow: known && balance < GAS_LOW_THRESHOLD,
    isPending,
    refetch,
  };
}
