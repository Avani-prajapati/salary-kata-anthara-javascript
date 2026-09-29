import { useState } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DirectoryFilters } from './DirectoryFilters';
import { DirectoryTable } from './DirectoryTable';

const EMPTY_FILTERS = { search: '', departmentId: '', countryId: '', jobLevelId: '' };

export function DirectoryPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  return (
    <Stack spacing={2}>
      <Typography variant="h5" component="h1">
        Directory
      </Typography>
      <DirectoryFilters filters={filters} onFiltersChange={setFilters} />
      <DirectoryTable filters={filters} />
    </Stack>
  );
}
