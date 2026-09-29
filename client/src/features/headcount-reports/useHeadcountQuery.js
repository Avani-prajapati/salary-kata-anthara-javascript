import { useQuery } from '@tanstack/react-query';
import { getHeadcount } from '../compensation-reports/reports.api';

export function useHeadcountQuery(groupBy) {
  return useQuery({
    queryKey: ['headcount', groupBy],
    queryFn: () => getHeadcount(groupBy),
  });
}
