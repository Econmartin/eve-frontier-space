import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentAccount, useDAppKit } from '@mysten/dapp-kit-react';
import { FAVORITES_PACKAGE_ID } from '../constants';
import { suiRpcClient } from '../suiRpcClient';
import {
  buildCreateAndAddFavoriteTx,
  buildAddFavoriteTx,
  buildRemoveFavoriteTx,
} from '../transactions';

interface FavoritesObject {
  objectId: string;
  urls: string[];
}

export function useFavorites() {
  const account = useCurrentAccount();
  const dAppKit = useDAppKit();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<Set<string>>(new Set());

  const FAVORITES_TYPE = `${FAVORITES_PACKAGE_ID}::favorites::Favorites`;
  const queryKey = ['favorites', account?.address];

  const { data, isPending: isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<FavoritesObject | null> => {
      const result = await suiRpcClient.getOwnedObjects({
        owner: account!.address,
        filter: { StructType: FAVORITES_TYPE },
        options: { showContent: true },
      });
      const obj = result.data[0];
      if (!obj?.data) return null;
      const content = obj.data.content;
      const fields =
        content?.dataType === 'moveObject'
          ? (content.fields as Record<string, unknown>)
          : {};
      return {
        objectId: obj.data.objectId,
        urls: (fields['urls'] as string[]) ?? [],
      };
    },
    enabled: !!account?.address && !!FAVORITES_PACKAGE_ID,
  });

  async function addFavorite(url: string) {
    if (!account || !FAVORITES_PACKAGE_ID) return;
    setPending(p => new Set(p).add(url));
    try {
      const tx = data?.objectId
        ? buildAddFavoriteTx(data.objectId, url)
        : buildCreateAndAddFavoriteTx(url, account.address);
      await dAppKit.signAndExecuteTransaction({ transaction: tx });
      await queryClient.invalidateQueries({ queryKey });
    } finally {
      setPending(p => { const next = new Set(p); next.delete(url); return next; });
    }
  }

  async function removeFavorite(url: string) {
    if (!account || !data?.objectId || !FAVORITES_PACKAGE_ID) return;
    setPending(p => new Set(p).add(url));
    try {
      await dAppKit.signAndExecuteTransaction({
        transaction: buildRemoveFavoriteTx(data.objectId, url),
      });
      await queryClient.invalidateQueries({ queryKey });
    } finally {
      setPending(p => { const next = new Set(p); next.delete(url); return next; });
    }
  }

  return {
    favorites: data?.urls ?? [],
    isLoading,
    pendingUrls: pending,
    addFavorite,
    removeFavorite,
  };
}
