import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EmployeeForm } from './EmployeeForm';
import { useCreateEmployeeMutation } from './useCreateEmployeeMutation';
import { createEmployee } from '../../api/employees.api';

vi.mock('../../api/employees.api', () => ({
  createEmployee: vi.fn(),
}));

const LOOKUPS = {
  departments: [{ id: 1, name: 'Engineering' }],
  countries: [{ id: 1, name: 'United States' }],
  jobLevels: [{ id: 1, label: 'L1 Associate' }],
};

function CreateEmployeeForm() {
  const mutation = useCreateEmployeeMutation();
  return <EmployeeForm lookups={LOOKUPS} onSubmit={mutation.mutate} />;
}

function renderWithQueryClient(ui) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('submitting the add-employee form', () => {
  it('blocks submission and shows an inline error when a required field is left empty', async () => {
    renderWithQueryClient(<CreateEmployeeForm />);

    await userEvent.click(screen.getByRole('button', { name: /add employee/i }));

    expect(await screen.findByText('First name is required')).toBeInTheDocument();
    expect(createEmployee).not.toHaveBeenCalled();
  });
});
