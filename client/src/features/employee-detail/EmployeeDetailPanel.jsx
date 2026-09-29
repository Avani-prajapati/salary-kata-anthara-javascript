import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CloseIcon from '@mui/icons-material/Close';
import { getDepartments, getCountries, getJobLevels } from '../../api/lookups.api';
import { LoadingState } from '../../shared/LoadingState';
import { ErrorState } from '../../shared/ErrorState';
import { EmployeeForm } from '../employee-form/EmployeeForm';
import { useUpdateEmployeeMutation } from '../employee-form/useUpdateEmployeeMutation';
import { useDeleteEmployeeMutation } from '../employee-form/useDeleteEmployeeMutation';
import { useEmployeeQuery } from './useEmployeeQuery';

const PANEL_WIDTH = 360;

function formatSalary(employee) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: employee.currencyCode }).format(
    employee.salaryMajorUnits
  );
}

const DETAIL_FIELDS = [
  { label: 'Email', getValue: (employee) => employee.email },
  { label: 'Department', getValue: (employee) => employee.departmentName },
  { label: 'Country', getValue: (employee) => employee.countryName },
  { label: 'Job level', getValue: (employee) => employee.jobLevelLabel },
  { label: 'Salary', getValue: formatSalary },
  { label: 'Hire date', getValue: (employee) => employee.hireDate },
];

function EditEmployeeDialog({ employee, isOpen, onClose }) {
  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: getDepartments });
  const { data: countries = [] } = useQuery({ queryKey: ['countries'], queryFn: getCountries });
  const { data: jobLevels = [] } = useQuery({ queryKey: ['jobLevels'], queryFn: getJobLevels });
  const updateEmployeeMutation = useUpdateEmployeeMutation(employee.id);

  function handleSubmit(formValues) {
    updateEmployeeMutation.mutate(formValues, { onSuccess: onClose });
  }

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit employee</DialogTitle>
      <DialogContent>
        <EmployeeForm
          lookups={{ departments, countries, jobLevels }}
          initialValues={employee}
          onSubmit={handleSubmit}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}

function DeleteConfirmDialog({ employee, isOpen, onClose, onConfirm }) {
  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle>Delete employee</DialogTitle>
      <DialogContent>
        <Typography>
          Delete {employee.firstName} {employee.lastName}'s record? This cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onConfirm} color="error" variant="contained">
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function EmployeeDetailPanel({ employeeId, onClose }) {
  const { data: employee, isLoading, isError } = useEmployeeQuery(employeeId);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const deleteEmployeeMutation = useDeleteEmployeeMutation(employeeId);

  function handleDeleteConfirm() {
    deleteEmployeeMutation.mutate(undefined, {
      onSuccess: () => {
        setIsDeleteConfirmOpen(false);
        onClose();
      },
    });
  }

  return (
    <Drawer anchor="right" open={employeeId != null} onClose={onClose}>
      <Box role="presentation" sx={{ width: PANEL_WIDTH, p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" component="h2">
            Employee detail
          </Typography>
          <IconButton aria-label="Close employee detail" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Stack>
        {isLoading && <LoadingState message="Loading employee..." />}
        {isError && <ErrorState message="Could not load this employee." />}
        {employee && (
          <Stack spacing={1.5}>
            <Typography variant="subtitle1">
              {employee.firstName} {employee.lastName}
            </Typography>
            {DETAIL_FIELDS.map(({ label, getValue }) => (
              <Stack key={label} direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  {label}
                </Typography>
                <Typography variant="body2">{getValue(employee)}</Typography>
              </Stack>
            ))}
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={() => setIsEditDialogOpen(true)}>
                Edit
              </Button>
              <Button variant="outlined" color="error" onClick={() => setIsDeleteConfirmOpen(true)}>
                Delete
              </Button>
            </Stack>
          </Stack>
        )}
      </Box>
      {employee && (
        <>
          <EditEmployeeDialog
            employee={employee}
            isOpen={isEditDialogOpen}
            onClose={() => setIsEditDialogOpen(false)}
          />
          <DeleteConfirmDialog
            employee={employee}
            isOpen={isDeleteConfirmOpen}
            onClose={() => setIsDeleteConfirmOpen(false)}
            onConfirm={handleDeleteConfirm}
          />
        </>
      )}
    </Drawer>
  );
}
