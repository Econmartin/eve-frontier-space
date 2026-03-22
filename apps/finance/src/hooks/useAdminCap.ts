import { useSuiClientQuery, useCurrentAccount } from '@mysten/dapp-kit';
import { PACKAGE_ID } from '../constants';

/**
 * Returns the AdminCap object ID if the connected wallet holds one,
 * otherwise null. Used to gate the admin panel UI.
 */
export function useAdminCap(): { capId: string | null; isLoading: boolean } {
  const account = useCurrentAccount();
  const ADMIN_CAP_TYPE = `${PACKAGE_ID}::bank::AdminCap`;

  const { data, isPending } = useSuiClientQuery(
    'getOwnedObjects',
    {
      owner:   account?.address ?? '',
      filter:  { StructType: ADMIN_CAP_TYPE },
      options: { showType: true },
    },
    { enabled: !!account?.address },
  );

  const capId = data?.data[0]?.data?.objectId ?? null;
  return { capId, isLoading: isPending };
}
