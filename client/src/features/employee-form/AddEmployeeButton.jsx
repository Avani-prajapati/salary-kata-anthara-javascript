import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import { getDepartments, getCountries, getJobLevels } from '../../api/lookups.api';
import { EmployeeForm } from './EmployeeForm';
import { MutationErrorAlert } from './MutationErrorAlert';
import { useCreateEmployeeMutation } from './useCreateEmployeeMutation';

export function AddEmployeeButton() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: getDepartments });
  const { data: countries = [] } = useQuery({ queryKey: ['countries'], queryFn: getCountries });
  const { data: jobLevels = [] } = useQuery({ queryKey: ['jobLevels'], queryFn: getJobLevels });
  const createEmployeeMutation = useCreateEmployeeMutation();

  function closeDialog() {
    setIsDialogOpen(false);
    createEmployeeMutation.reset();
  }

  function handleSubmit(formValues) {
    createEmployeeMutation.mutate(formValues, { onSuccess: closeDialog });
  }

  return (
    <>
      <Button variant="contained" onClick={() => setIsDialogOpen(true)}>
        Add Employee
      </Button>
      <Dialog open={isDialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>Add employee</DialogTitle>
        <DialogContent>
          <MutationErrorAlert error={createEmployeeMutation.isError ? createEmployeeMutation.error : null} />
          <EmployeeForm lookups={{ departments, countries, jobLevels }} onSubmit={handleSubmit} onCancel={closeDialog} />
        </DialogContent>
      </Dialog>
    </>
  );
}
