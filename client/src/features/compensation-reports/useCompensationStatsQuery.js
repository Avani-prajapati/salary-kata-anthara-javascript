import { useQuery } from '@tanstack/react-query';
import { getCompensationStats } from './reports.api';

export function useCompensationStatsQuery(groupBy) {
  return useQuery({
    queryKey: ['compensationStats', groupBy],
    queryFn: () => getCompensationStats(groupBy),
  });
}
