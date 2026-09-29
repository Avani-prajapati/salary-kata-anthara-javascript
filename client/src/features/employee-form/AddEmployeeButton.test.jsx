import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AddEmployeeButton } from './AddEmployeeButton';
import { useCreateEmployeeMutation } from './useCreateEmployeeMutation';

vi.mock('./useCreateEmployeeMutation', () => ({
  useCreateEmployeeMutation: vi.fn(),
}));

vi.mock('../../api/lookups.api', () => ({
  getDepartments: vi.fn().mockResolvedValue([]),
  getCountries: vi.fn().mockResolvedValue([]),
  getJobLevels: vi.fn().mockResolvedValue([]),
}));

afterEach(cleanup);

function renderAddEmployeeButton() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AddEmployeeButton />
    </QueryClientProvider>
  );
}

describe('submitting a new employee that the server rejects', () => {
  it('renders the server-reported reason inside the add-employee dialog', async () => {
    useCreateEmployeeMutation.mockReturnValue({
      mutate: vi.fn(),
      reset: vi.fn(),
      isError: true,
      error: { message: 'Email is already in use.', fields: [] },
    });

    renderAddEmployeeButton();
    await userEvent.click(screen.getByRole('button', { name: /add employee/i }));

    expect(await screen.findByText('Email is already in use.')).toBeInTheDocument();
  });

  it('renders the field-level reason when the server rejects with a validation shape', async () => {
    useCreateEmployeeMutation.mockReturnValue({
      mutate: vi.fn(),
      reset: vi.fn(),
      isError: true,
      error: { fields: [{ field: 'salaryMajorUnits', message: 'salaryMajorUnits must be a positive number' }] },
    });

    renderAddEmployeeButton();
    await userEvent.click(screen.getByRole('button', { name: /add employee/i }));

    expect(await screen.findByText('salaryMajorUnits must be a positive number')).toBeInTheDocument();
  });

  it('shows no error alert while the mutation has not failed', async () => {
    useCreateEmployeeMutation.mockReturnValue({
      mutate: vi.fn(),
      reset: vi.fn(),
      isError: false,
      error: null,
    });

    renderAddEmployeeButton();
    await userEvent.click(screen.getByRole('button', { name: /add employee/i }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
