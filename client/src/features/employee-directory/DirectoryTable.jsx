import { useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { EmptyState } from '../../shared/EmptyState';
import { ErrorState } from '../../shared/ErrorState';
import { useEmployeesQuery } from './useEmployeesQuery';

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const GRID_FIELD_TO_SORT_BY = {
  name: 'lastName',
  departmentName: 'department',
  countryName: 'country',
  jobLevelLabel: 'jobLevel',
  salaryMajorUnits: 'salary',
  hireDate: 'hireDate',
};

const COLUMNS = [
  {
    field: 'name',
    headerName: 'Name',
    flex: 1.4,
    valueGetter: (value, row) => `${row.firstName} ${row.lastName}`,
  },
  { field: 'departmentName', headerName: 'Dept', flex: 1 },
  { field: 'countryName', headerName: 'Country', flex: 1 },
  { field: 'jobLevelLabel', headerName: 'Level', flex: 0.8 },
  {
    field: 'salaryMajorUnits',
    headerName: 'Salary',
    flex: 0.8,
    renderCell: ({ row }) => formatSalary(row.salaryMajorUnits, row.currencyCode),
  },
  { field: 'hireDate', headerName: 'Hired', flex: 0.8 },
];

function formatSalary(salaryMajorUnits, currencyCode) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode }).format(salaryMajorUnits);
}

function NoRowsOverlay() {
  return <EmptyState message="No employees match your search." />;
}

const DEFAULT_SORT_MODEL = [{ field: 'name', sort: 'asc' }];

function focusableCellFor(target) {
  return target.closest('[role="gridcell"], [role="rowheader"]');
}

export function DirectoryTable({ filters, onSelectEmployee = () => {} }) {
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: DEFAULT_PAGE_SIZE });
  const [sortModel, setSortModel] = useState(DEFAULT_SORT_MODEL);

  const activeSort = sortModel[0];
  const queryParams = {
    page: paginationModel.page + 1,
    pageSize: paginationModel.pageSize,
    search: filters.search,
    department: filters.departmentId,
    country: filters.countryId,
    jobLevel: filters.jobLevelId,
    sortBy: GRID_FIELD_TO_SORT_BY[activeSort?.field] ?? 'lastName',
    sortDir: activeSort?.sort ?? 'asc',
  };

  const { data, isLoading, isError } = useEmployeesQuery(queryParams);

  if (isError) {
    return <ErrorState message="Could not load the employee directory." />;
  }

  return (
    <DataGrid
      autoHeight
      rows={data?.items ?? []}
      getRowId={(row) => row.id}
      columns={COLUMNS}
      loading={isLoading}
      paginationMode="server"
      sortingMode="server"
      rowCount={data?.total ?? 0}
      paginationModel={paginationModel}
      onPaginationModelChange={setPaginationModel}
      sortModel={sortModel}
      onSortModelChange={setSortModel}
      pageSizeOptions={PAGE_SIZE_OPTIONS}
      slots={{ noRowsOverlay: NoRowsOverlay }}
      onRowClick={(params, event) => onSelectEmployee(params.id, focusableCellFor(event.target))}
      onCellKeyDown={(params, event) => {
        if (event.key === 'Enter') {
          onSelectEmployee(params.id, focusableCellFor(event.target));
        }
      }}
    />
  );
}
