import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateEmployee } from '../employee-directory/employees.api';

export function useUpdateEmployeeMutation(id) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => updateEmployee(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
    },
  });
}
