import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DirectoryPage } from './DirectoryPage';
import { useEmployeesQuery } from './useEmployeesQuery';
import { useEmployeeQuery } from '../employee-detail/useEmployeeQuery';

vi.mock('./useEmployeesQuery', () => ({
  useEmployeesQuery: vi.fn(),
}));

vi.mock('../employee-detail/useEmployeeQuery', () => ({
  useEmployeeQuery: vi.fn(),
}));

vi.mock('./DirectoryFilters', () => ({
  DirectoryFilters: () => null,
}));

vi.mock('../employee-form/AddEmployeeButton', () => ({
  AddEmployeeButton: () => null,
}));

vi.mock('../../api/lookups.api', () => ({
  getDepartments: vi.fn().mockResolvedValue([]),
  getCountries: vi.fn().mockResolvedValue([]),
  getJobLevels: vi.fn().mockResolvedValue([]),
}));

vi.mock('../employee-form/useDeleteEmployeeMutation', () => ({
  useDeleteEmployeeMutation: vi.fn(() => ({
    mutate: vi.fn(),
  })),
}));

const DIRECTORY_ROW = {
  id: 1,
  firstName: 'Jane',
  lastName: 'Doe',
  departmentName: 'Engineering',
  countryName: 'Germany',
  jobLevelLabel: 'Staff',
  salaryMajorUnits: 95000,
  currencyCode: 'EUR',
  hireDate: '2021-03-01',
};

const EMPLOYEE_DETAIL = { ...DIRECTORY_ROW, email: 'jane.doe@acme.example' };

afterEach(cleanup);

function renderDirectoryWithOneEmployee() {
  useEmployeesQuery.mockReturnValue({ data: { items: [DIRECTORY_ROW], total: 1 }, isLoading: false, isError: false });
  useEmployeeQuery.mockReturnValue({ data: EMPLOYEE_DETAIL, isLoading: false, isError: false });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <DirectoryPage />
    </QueryClientProvider>
  );
}

describe('viewing an employee record from the directory', () => {
  it('opens the detail panel populated with the clicked row data', async () => {
    renderDirectoryWithOneEmployee();

    await userEvent.click(screen.getByText('Jane Doe'));

    expect(screen.getByText('jane.doe@acme.example')).toBeInTheDocument();
  });

  it('returns focus to the clicked row once the panel is closed', async () => {
    renderDirectoryWithOneEmployee();
    const row = screen.getByText('Jane Doe');

    await userEvent.click(row);
    await userEvent.click(screen.getByRole('button', { name: /close employee detail/i }));

    expect(row).toHaveFocus();
  });
});

describe('deleting an employee record', () => {
  it('canceling the delete confirmation sends no request', async () => {
    const { useDeleteEmployeeMutation } = await import('../employee-form/useDeleteEmployeeMutation');
    const mockMutate = vi.fn();
    useDeleteEmployeeMutation.mockReturnValueOnce({
      mutate: mockMutate,
    });

    renderDirectoryWithOneEmployee();

    await userEvent.click(screen.getByText('Jane Doe'));
    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockMutate).not.toHaveBeenCalled();
  });
});
