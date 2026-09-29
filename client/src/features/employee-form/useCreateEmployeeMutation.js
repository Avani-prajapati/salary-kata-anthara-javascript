import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createEmployee } from '../../api/employees.api';

export function useCreateEmployeeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}
