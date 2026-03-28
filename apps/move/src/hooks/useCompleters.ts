import { useQuery } from '@tanstack/react-query';
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
import { COURSE_COMPLETED_EVENT_TYPE } from '@/lib/registry-constants';

const suiClient = new SuiJsonRpcClient({
  network: 'testnet',
  url: getJsonRpcFullnodeUrl('testnet'),
});

export interface Completer {
  address: string;
  courses: (1 | 2)[];
  name: string;
  epoch: number; // earliest registration epoch
}

interface EventFields {
  learner: string;
  course: number;
  name: string;
  epoch: string;
}

export function useCompleters() {
  return useQuery({
    queryKey: ['completers'],
    queryFn: async (): Promise<Completer[]> => {
      const result = await suiClient.queryEvents({
        query: { MoveEventType: COURSE_COMPLETED_EVENT_TYPE },
        limit: 200,
        order: 'ascending',
      });

      // Group by address — same person may have completed both courses
      const byAddress = new Map<string, Completer>();
      for (const event of result.data as { parsedJson: unknown }[]) {
        const f = event.parsedJson as EventFields;
        const course = (f.course === 1 ? 1 : 2) as 1 | 2;
        const epoch = Number(f.epoch);
        const existing = byAddress.get(f.learner);
        if (existing) {
          if (!existing.courses.includes(course)) existing.courses.push(course);
          if (epoch < existing.epoch) existing.epoch = epoch;
        } else {
          byAddress.set(f.learner, {
            address: f.learner,
            courses: [course],
            name: f.name || `${f.learner.slice(0, 6)}…`,
            epoch,
          });
        }
      }

      return [...byAddress.values()];
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
