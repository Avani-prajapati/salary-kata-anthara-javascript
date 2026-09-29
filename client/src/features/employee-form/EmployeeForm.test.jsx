import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EmployeeForm } from './EmployeeForm';
import { useCreateEmployeeMutation } from './useCreateEmployeeMutation';
import { createEmployee } from '../employee-directory/employees.api';

vi.mock('../employee-directory/employees.api', () => ({
  createEmployee: vi.fn(),
}));

afterEach(cleanup);

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

const EXISTING_EMPLOYEE = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane.doe@acme.example',
  departmentId: 1,
  countryId: 1,
  jobLevelId: 1,
  salaryMajorUnits: 95000,
  hireDate: '2021-03-01',
};

describe('rendering the edit-employee form with initial values', () => {
  it('pre-fills every field from the employee being edited', () => {
    renderWithQueryClient(<EmployeeForm lookups={LOOKUPS} onSubmit={vi.fn()} initialValues={EXISTING_EMPLOYEE} />);

    expect(screen.getByLabelText(/first name/i)).toHaveValue(EXISTING_EMPLOYEE.firstName);
    expect(screen.getByLabelText(/last name/i)).toHaveValue(EXISTING_EMPLOYEE.lastName);
    expect(screen.getByLabelText(/email/i)).toHaveValue(EXISTING_EMPLOYEE.email);
    expect(screen.getByLabelText(/salary/i)).toHaveValue(EXISTING_EMPLOYEE.salaryMajorUnits);
    expect(screen.getByLabelText(/hire date/i)).toHaveValue(EXISTING_EMPLOYEE.hireDate);
    expect(screen.getByText(LOOKUPS.departments[0].name)).toBeInTheDocument();
    expect(screen.getByText(LOOKUPS.countries[0].name)).toBeInTheDocument();
    expect(screen.getByText(LOOKUPS.jobLevels[0].label)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });
});

describe('marking required fields for assistive technology', () => {
  it('flags every required text field with the native required attribute', () => {
    renderWithQueryClient(<EmployeeForm lookups={LOOKUPS} onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/first name/i)).toBeRequired();
    expect(screen.getByLabelText(/last name/i)).toBeRequired();
    expect(screen.getByLabelText(/email/i)).toBeRequired();
    expect(screen.getByLabelText(/salary/i)).toBeRequired();
    expect(screen.getByLabelText(/hire date/i)).toBeRequired();
  });

  it('flags every required lookup select as aria-required', () => {
    renderWithQueryClient(<EmployeeForm lookups={LOOKUPS} onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/^department/i)).toHaveAttribute('aria-required', 'true');
    expect(screen.getByLabelText(/^country/i)).toHaveAttribute('aria-required', 'true');
    expect(screen.getByLabelText(/^job level/i)).toHaveAttribute('aria-required', 'true');
  });
});
