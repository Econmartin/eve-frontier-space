import { useSuiClientQuery, useCurrentAccount } from '@mysten/dapp-kit';
import { PACKAGE_ID } from '../constants';

export interface BankShareObject {
  objectId: string;
  shares:   string;
}

// BankShare is the same struct type regardless of network — the coin type
// is baked into the CentralBank, not the share itself.
export function useBankShares(): { shares: BankShareObject[]; isLoading: boolean } {
  const account = useCurrentAccount();
  const BANK_SHARE_TYPE = `${PACKAGE_ID}::bank::BankShare`;

  const { data, isPending } = useSuiClientQuery(
    'getOwnedObjects',
    {
      owner:   account?.address ?? '',
      filter:  { StructType: BANK_SHARE_TYPE },
      options: { showContent: true },
    },
    { enabled: !!account?.address },
  );

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
