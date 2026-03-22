import { useQuery } from '@tanstack/react-query';
import { useCurrentAccount, useCurrentClient } from '@mysten/dapp-kit-react';

const SUI_COIN_TYPE = '0x2::sui::SUI';

/** Below 0.1 SUI — warn the user to request testnet gas */
const GAS_LOW_THRESHOLD = 100_000_000n;

export function useSuiBalance() {
  const account = useCurrentAccount();
  const client = useCurrentClient();

  const { data, isPending, refetch } = useQuery({
    queryKey: ['suiBalance', account?.address],
    queryFn: () => client.getBalance({ owner: account!.address, coinType: SUI_COIN_TYPE }),
    enabled: !!account?.address,
  });

  const balance = BigInt(data?.totalBalance ?? '0');

  return {
    balance,
    isLow: balance < GAS_LOW_THRESHOLD,
    isPending,
    refetch,
  };
}
