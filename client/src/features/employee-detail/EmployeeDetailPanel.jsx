import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { LoadingState } from '../../shared/LoadingState';
import { ErrorState } from '../../shared/ErrorState';
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

export function EmployeeDetailPanel({ employeeId, onClose }) {
  const { data: employee, isLoading, isError } = useEmployeeQuery(employeeId);

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
          </Stack>
        )}
      </Box>
    </Drawer>
  );
}
