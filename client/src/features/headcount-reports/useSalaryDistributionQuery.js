import { useQuery } from '@tanstack/react-query';
import { getSalaryDistribution } from '../../api/reports.api';

export function useSalaryDistributionQuery(currencyCode) {
  return useQuery({
    queryKey: ['salaryDistribution', currencyCode],
    queryFn: () => getSalaryDistribution(currencyCode),
  });
}
