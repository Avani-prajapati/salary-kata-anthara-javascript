import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteEmployee } from '../../api/employees.api';

export function useDeleteEmployeeMutation(id) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}
