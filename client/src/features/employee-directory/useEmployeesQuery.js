import { useQuery } from '@tanstack/react-query';
import { getEmployees } from './employees.api';

export function useEmployeesQuery(params) {
  return useQuery({
    queryKey: ['employees', params],
    queryFn: () => getEmployees(params),
    placeholderData: (previousData) => previousData,
  });
}
