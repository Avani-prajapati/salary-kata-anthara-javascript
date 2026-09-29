import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import { getCountries } from '../../api/lookups.api';
import { EmptyState } from '../../shared/EmptyState';
import { ErrorState } from '../../shared/ErrorState';
import { LoadingState } from '../../shared/LoadingState';
import { ExportCsvButton } from '../../shared/ExportCsvButton';
import { useHeadcountQuery } from './useHeadcountQuery';
import { useSalaryDistributionQuery } from './useSalaryDistributionQuery';

const DEFAULT_GROUP_BY = 'department';
const GROUP_BY_OPTIONS = [
  { value: 'department', label: 'Department' },
  { value: 'country', label: 'Country' },
  { value: 'jobLevel', label: 'Job level' },
];
const GROUP_BY_LABEL_ID = 'headcount-group-by-label';
const CURRENCY_LABEL_ID = 'salary-distribution-currency-label';
const AUTO_CURRENCY_VALUE = '';

function formatMoney(amountMajorUnits, currencyCode) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode }).format(amountMajorUnits);
}

function barWidthPercent(count, maxCount) {
  return maxCount === 0 ? 0 : (count / maxCount) * 100;
}

function GroupBySelector({ groupBy, onGroupByChange }) {
  return (
    <FormControl>
      <FormLabel id={GROUP_BY_LABEL_ID}>Group by</FormLabel>
      <RadioGroup row aria-labelledby={GROUP_BY_LABEL_ID} value={groupBy} onChange={onGroupByChange}>
        {GROUP_BY_OPTIONS.map((option) => (
          <FormControlLabel key={option.value} value={option.value} control={<Radio />} label={option.label} />
        ))}
      </RadioGroup>
    </FormControl>
  );
}

function HeadcountBars({ headcount }) {
  if (headcount.length === 0) {
    return <EmptyState message="No headcount data matches this grouping." />;
  }

  const maxCount = Math.max(...headcount.map((row) => row.count));

  return (
    <Stack spacing={1}>
      {headcount.map((row) => (
        <Stack key={row.groupId} direction="row" alignItems="center" spacing={1}>
          <Typography variant="body2" sx={{ width: 160 }}>
            {row.groupLabel}
          </Typography>
          <Box sx={{ flexGrow: 1, bgcolor: 'grey.200', borderRadius: 1 }}>
            <Box
              sx={{
                width: `${barWidthPercent(row.count, maxCount)}%`,
                bgcolor: 'primary.main',
                borderRadius: 1,
                height: 20,
              }}
            />
          </Box>
          <Typography variant="body2" sx={{ width: 48, textAlign: 'right' }}>
            {row.count}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

function SalaryDistributionBars({ buckets, currencyCode }) {
  if (buckets.length === 0) {
    return <EmptyState message="No salary data is available for this currency." />;
  }

  const maxCount = Math.max(...buckets.map((bucket) => bucket.count));

  return (
    <Stack spacing={1}>
      {buckets.map((bucket) => (
        <Stack key={bucket.bucketIndex} direction="row" alignItems="center" spacing={1}>
          <Typography variant="body2" sx={{ width: 220 }}>
            {formatMoney(bucket.minMajorUnits, currencyCode)} – {formatMoney(bucket.maxMajorUnits, currencyCode)}
          </Typography>
          <Box sx={{ flexGrow: 1, bgcolor: 'grey.200', borderRadius: 1 }}>
            <Box
              sx={{
                width: `${barWidthPercent(bucket.count, maxCount)}%`,
                bgcolor: 'secondary.main',
                borderRadius: 1,
                height: 20,
              }}
            />
          </Box>
          <Typography variant="body2" sx={{ width: 48, textAlign: 'right' }}>
            {bucket.count}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

function CurrencySelector({ currencyCode, onCurrencyChange }) {
  const { data: countries = [] } = useQuery({ queryKey: ['countries'], queryFn: getCountries });
  const currencyCodes = [...new Set(countries.map((country) => country.defaultCurrencyCode))].sort();

  return (
    <TextField select label="Currency" value={currencyCode} onChange={onCurrencyChange} size="small" sx={{ minWidth: 160 }}>
      <MenuItem value={AUTO_CURRENCY_VALUE}>Default (largest headcount)</MenuItem>
      {currencyCodes.map((code) => (
        <MenuItem key={code} value={code}>
          {code}
        </MenuItem>
      ))}
    </TextField>
  );
}

export function HeadcountReportsPage() {
  const [groupBy, setGroupBy] = useState(DEFAULT_GROUP_BY);
  const [requestedCurrencyCode, setRequestedCurrencyCode] = useState(AUTO_CURRENCY_VALUE);

  const headcountQuery = useHeadcountQuery(groupBy);
  const distributionQuery = useSalaryDistributionQuery(requestedCurrencyCode || undefined);

  const resolvedCurrencyCode = requestedCurrencyCode || distributionQuery.data?.currencyCode || '';

  return (
    <Stack spacing={4}>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" component="h1">
            Headcount
          </Typography>
          <ExportCsvButton path="/api/reports/headcount/export" params={{ groupBy }} />
        </Stack>
        <GroupBySelector groupBy={groupBy} onGroupByChange={(event) => setGroupBy(event.target.value)} />
        {headcountQuery.isLoading && <LoadingState />}
        {headcountQuery.isError && <ErrorState message="Could not load headcount data." />}
        {!headcountQuery.isLoading && !headcountQuery.isError && (
          <HeadcountBars headcount={headcountQuery.data ?? []} />
        )}
      </Stack>

      <Stack spacing={2}>
        <Typography variant="h5" component="h2">
          Salary distribution
        </Typography>
        <Typography id={CURRENCY_LABEL_ID} variant="body2" color="text.secondary">
          {resolvedCurrencyCode
            ? `Showing salaries in ${resolvedCurrencyCode}.`
            : 'Resolving the default currency…'}
        </Typography>
        <CurrencySelector
          currencyCode={requestedCurrencyCode}
          onCurrencyChange={(event) => setRequestedCurrencyCode(event.target.value)}
        />
        {distributionQuery.isLoading && <LoadingState />}
        {distributionQuery.isError && <ErrorState message="Could not load the salary distribution." />}
        {!distributionQuery.isLoading && !distributionQuery.isError && (
          <SalaryDistributionBars buckets={distributionQuery.data?.buckets ?? []} currencyCode={resolvedCurrencyCode} />
        )}
      </Stack>
    </Stack>
  );
}
