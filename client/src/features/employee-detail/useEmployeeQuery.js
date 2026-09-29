import { useQuery } from '@tanstack/react-query';
import { getEmployee } from '../../api/employees.api';

export function useEmployeeQuery(employeeId) {
  return useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => getEmployee(employeeId),
    enabled: employeeId != null,
  });
}
