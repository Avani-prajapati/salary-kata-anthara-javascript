import { useQuery } from '@tanstack/react-query';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import { getDepartments, getCountries, getJobLevels } from '../../api/lookups.api';

const ALL_OPTION_VALUE = '';

function useLookupOptions(label, queryKey, queryFn) {
  const { data } = useQuery({ queryKey: [queryKey], queryFn });
  return { label, options: data ?? [] };
}

function FilterSelect({ label, options, value, onChange }) {
  return (
    <TextField select label={label} value={value} onChange={onChange} size="small" sx={{ minWidth: 160 }}>
      <MenuItem value={ALL_OPTION_VALUE}>All</MenuItem>
      {options.map((option) => (
        <MenuItem key={option.id} value={option.id}>
          {option.name ?? option.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

export function DirectoryFilters({ filters, onFiltersChange }) {
  const departments = useLookupOptions('Department', 'departments', getDepartments);
  const countries = useLookupOptions('Country', 'countries', getCountries);
  const jobLevels = useLookupOptions('Level', 'jobLevels', getJobLevels);

  function updateFilter(field, value) {
    onFiltersChange({ ...filters, [field]: value });
  }

  return (
    <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
      <TextField
        label="Search name"
        value={filters.search}
        onChange={(event) => updateFilter('search', event.target.value)}
        size="small"
        sx={{ minWidth: 220 }}
      />
      <FilterSelect
        label={departments.label}
        options={departments.options}
        value={filters.departmentId}
        onChange={(event) => updateFilter('departmentId', event.target.value)}
      />
      <FilterSelect
        label={countries.label}
        options={countries.options}
        value={filters.countryId}
        onChange={(event) => updateFilter('countryId', event.target.value)}
      />
      <FilterSelect
        label={jobLevels.label}
        options={jobLevels.options}
        value={filters.jobLevelId}
        onChange={(event) => updateFilter('jobLevelId', event.target.value)}
      />
    </Stack>
  );
}
