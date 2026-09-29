import { useQuery } from '@tanstack/react-query';
import { getEmployee } from '../employee-directory/employees.api';

export function useEmployeeQuery(employeeId) {
  return useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => getEmployee(employeeId),
    enabled: employeeId != null,
  });
}
