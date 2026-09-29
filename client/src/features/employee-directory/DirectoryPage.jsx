import { useRef, useState } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DirectoryFilters } from './DirectoryFilters';
import { DirectoryTable } from './DirectoryTable';
import { EmployeeDetailPanel } from '../employee-detail/EmployeeDetailPanel';

const EMPTY_FILTERS = { search: '', departmentId: '', countryId: '', jobLevelId: '' };

export function DirectoryPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const triggerElementRef = useRef(null);

  function openEmployee(employeeId, triggerElement) {
    triggerElementRef.current = triggerElement;
    setSelectedEmployeeId(employeeId);
  }

  function closePanel() {
    setSelectedEmployeeId(null);
    triggerElementRef.current?.focus();
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h5" component="h1">
        Directory
      </Typography>
      <DirectoryFilters filters={filters} onFiltersChange={setFilters} />
      <DirectoryTable filters={filters} onSelectEmployee={openEmployee} />
      <EmployeeDetailPanel employeeId={selectedEmployeeId} onClose={closePanel} />
    </Stack>
  );
}
