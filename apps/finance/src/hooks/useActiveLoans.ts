import { useQuery } from '@tanstack/react-query';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { PACKAGE_ID } from '../constants';
import { suiRpcClient } from '../suiRpcClient';

export interface ActiveLoanObject {
  objectId:  string;
  principal: string;
  amountDue: string;
}

export function useActiveLoans(): { loans: ActiveLoanObject[]; isLoading: boolean } {
  const account = useCurrentAccount();
  const ACTIVE_LOAN_TYPE = `${PACKAGE_ID}::bank::ActiveLoan`;

  const { data, isPending } = useQuery({
    queryKey: ['getOwnedObjects', account?.address, ACTIVE_LOAN_TYPE],
    queryFn: () => suiRpcClient.getOwnedObjects({
      owner:   account!.address,
      filter:  { StructType: ACTIVE_LOAN_TYPE },
      options: { showContent: true },
    }),
    enabled: !!account?.address,
  });

  const loans: ActiveLoanObject[] = (data?.data ?? []).map((obj) => {
    const content = obj.data?.content;
    const fields =
      content?.dataType === 'moveObject'
        ? (content.fields as Record<string, string>)
        : {};
    return {
      objectId:  obj.data?.objectId ?? '',
      principal: fields['principal'] ?? '0',
      amountDue: fields['amount_due'] ?? '0',
    };
  });

  return { loans, isLoading: isPending };
}
