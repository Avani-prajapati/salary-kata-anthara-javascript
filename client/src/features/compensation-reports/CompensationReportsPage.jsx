import { useState } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import { EmptyState } from '../../shared/EmptyState';
import { ErrorState } from '../../shared/ErrorState';
import { LoadingState } from '../../shared/LoadingState';
import { ExportCsvButton } from '../../shared/ExportCsvButton';
import { useCompensationStatsQuery } from './useCompensationStatsQuery';

const DEFAULT_GROUP_BY = 'department';
const GROUP_BY_OPTIONS = [
  { value: 'department', label: 'Department' },
  { value: 'country', label: 'Country' },
  { value: 'jobLevel', label: 'Job level' },
];
const GROUP_BY_LABEL_ID = 'compensation-group-by-label';

function formatMoney(amountMajorUnits, currencyCode) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode }).format(amountMajorUnits);
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

function CompensationStatsTable({ stats }) {
  if (stats.length === 0) {
    return <EmptyState message="No compensation data matches this grouping." />;
  }

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell scope="col">Group</TableCell>
          <TableCell scope="col">Currency</TableCell>
          <TableCell scope="col" align="right">
            Count
          </TableCell>
          <TableCell scope="col" align="right">
            Average
          </TableCell>
          <TableCell scope="col" align="right">
            Median
          </TableCell>
          <TableCell scope="col" align="right">
            Min
          </TableCell>
          <TableCell scope="col" align="right">
            Max
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {stats.map((row) => (
          <TableRow key={`${row.groupId}-${row.currencyCode}`}>
            <TableCell>{row.groupLabel}</TableCell>
            <TableCell>{row.currencyCode}</TableCell>
            <TableCell align="right">{row.count}</TableCell>
            <TableCell align="right">{formatMoney(row.avgMajorUnits, row.currencyCode)}</TableCell>
            <TableCell align="right">{formatMoney(row.medianMajorUnits, row.currencyCode)}</TableCell>
            <TableCell align="right">{formatMoney(row.minMajorUnits, row.currencyCode)}</TableCell>
            <TableCell align="right">{formatMoney(row.maxMajorUnits, row.currencyCode)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function CompensationReportsPage() {
  const [groupBy, setGroupBy] = useState(DEFAULT_GROUP_BY);
  const { data, isLoading, isError } = useCompensationStatsQuery(groupBy);

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" component="h1">
          Compensation Reports
        </Typography>
        <ExportCsvButton path="/api/reports/compensation-stats/export" params={{ groupBy }} />
      </Stack>
      <GroupBySelector groupBy={groupBy} onGroupByChange={(event) => setGroupBy(event.target.value)} />
      {isLoading && <LoadingState />}
      {isError && <ErrorState message="Could not load compensation statistics." />}
      {!isLoading && !isError && <CompensationStatsTable stats={data ?? []} />}
    </Stack>
  );
}
