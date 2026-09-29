import { useQuery } from '@tanstack/react-query';
import { getSalaryDistribution } from '../compensation-reports/reports.api';

export function useSalaryDistributionQuery(currencyCode) {
  return useQuery({
    queryKey: ['salaryDistribution', currencyCode],
    queryFn: () => getSalaryDistribution(currencyCode),
  });
}
