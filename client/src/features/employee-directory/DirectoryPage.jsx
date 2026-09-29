import { useRef, useState } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DirectoryFilters } from './DirectoryFilters';
import { DirectoryTable } from './DirectoryTable';
import { EmployeeDetailPanel } from '../employee-detail/EmployeeDetailPanel';
import { AddEmployeeButton } from '../employee-form/AddEmployeeButton';
import { ExportCsvButton } from '../../shared/ExportCsvButton';

const EMPTY_FILTERS = { search: '', departmentId: '', countryId: '', jobLevelId: '' };

export function DirectoryPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const directoryTableRef = useRef(null);

  function closePanel() {
    const employeeIdToRefocus = selectedEmployeeId;
    setSelectedEmployeeId(null);
    directoryTableRef.current?.focusRow(employeeIdToRefocus);
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" component="h1">
          Directory
        </Typography>
        <AddEmployeeButton />
      </Stack>
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
        <DirectoryFilters filters={filters} onFiltersChange={setFilters} />
        <ExportCsvButton
          path="/api/employees/export"
          params={{
            search: filters.search,
            department: filters.departmentId,
            country: filters.countryId,
            jobLevel: filters.jobLevelId,
          }}
        />
      </Stack>
      <DirectoryTable ref={directoryTableRef} filters={filters} onSelectEmployee={setSelectedEmployeeId} />
      <EmployeeDetailPanel employeeId={selectedEmployeeId} onClose={closePanel} />
    </Stack>
  );
}
