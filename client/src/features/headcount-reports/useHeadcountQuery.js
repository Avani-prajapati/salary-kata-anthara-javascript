import { useQuery } from '@tanstack/react-query';
import { getHeadcount } from '../../api/reports.api';

export function useHeadcountQuery(groupBy) {
  return useQuery({
    queryKey: ['headcount', groupBy],
    queryFn: () => getHeadcount(groupBy),
  });
}
