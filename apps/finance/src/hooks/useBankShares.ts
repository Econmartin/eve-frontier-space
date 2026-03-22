import { useQuery } from '@tanstack/react-query';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { PACKAGE_ID } from '../constants';
import { suiRpcClient } from '../suiRpcClient';

export interface BankShareObject {
  objectId: string;
  shares:   string;
}

export function useBankShares(): { shares: BankShareObject[]; isLoading: boolean } {
  const account = useCurrentAccount();
  const BANK_SHARE_TYPE = `${PACKAGE_ID}::bank::BankShare`;

  const { data, isPending } = useQuery({
    queryKey: ['getOwnedObjects', account?.address, BANK_SHARE_TYPE],
    queryFn: () => suiRpcClient.getOwnedObjects({
      owner:   account!.address,
      filter:  { StructType: BANK_SHARE_TYPE },
      options: { showContent: true },
    }),
    enabled: !!account?.address,
  });

  const shares: BankShareObject[] = (data?.data ?? []).map((obj) => {
    const content = obj.data?.content;
    const fields =
      content?.dataType === 'moveObject'
        ? (content.fields as Record<string, string>)
        : {};
    return {
      objectId: obj.data?.objectId ?? '',
      shares:   fields['shares'] ?? '0',
    };
  });

  return { shares, isLoading: isPending };
}
