import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EmployeeDetailPanel } from './EmployeeDetailPanel';
import { useEmployeeQuery } from './useEmployeeQuery';
import { useUpdateEmployeeMutation } from '../employee-form/useUpdateEmployeeMutation';

vi.mock('./useEmployeeQuery', () => ({
  useEmployeeQuery: vi.fn(),
}));

vi.mock('../employee-form/useUpdateEmployeeMutation', () => ({
  useUpdateEmployeeMutation: vi.fn(),
}));

vi.mock('../employee-form/useDeleteEmployeeMutation', () => ({
  useDeleteEmployeeMutation: vi.fn(() => ({ mutate: vi.fn() })),
}));

vi.mock('../../api/lookups.api', () => ({
  getDepartments: vi.fn().mockResolvedValue([]),
  getCountries: vi.fn().mockResolvedValue([]),
  getJobLevels: vi.fn().mockResolvedValue([]),
}));

afterEach(cleanup);

const EMPLOYEE = {
  id: 1,
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane.doe@acme.example',
  departmentName: 'Engineering',
  countryName: 'Germany',
  jobLevelLabel: 'Staff',
  salaryMajorUnits: 95000,
  currencyCode: 'EUR',
  hireDate: '2021-03-01',
};

function renderDetailPanel() {
  useEmployeeQuery.mockReturnValue({ data: EMPLOYEE, isLoading: false, isError: false });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <EmployeeDetailPanel employeeId={1} onClose={vi.fn()} />
    </QueryClientProvider>
  );
}

describe('editing an employee whose country change the server rejects', () => {
  it('renders the rejected-country-change reason inside the edit dialog', async () => {
    useUpdateEmployeeMutation.mockReturnValue({
      mutate: vi.fn(),
      reset: vi.fn(),
      isError: true,
      error: { fields: [{ field: 'countryId', message: 'Country cannot be changed on this endpoint' }] },
    });

    renderDetailPanel();
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }));

    expect(await screen.findByText('Country cannot be changed on this endpoint')).toBeInTheDocument();
  });
});
