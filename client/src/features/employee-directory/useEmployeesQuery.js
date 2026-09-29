import { useQuery } from '@tanstack/react-query';
import { getEmployees } from '../../api/employees.api';

export function useEmployeesQuery(params) {
  return useQuery({
    queryKey: ['employees', params],
    queryFn: () => getEmployees(params),
    placeholderData: (previousData) => previousData,
  });
}
