import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DirectoryTable } from './DirectoryTable';
import { useEmployeesQuery } from './useEmployeesQuery';

vi.mock('./useEmployeesQuery', () => ({
  useEmployeesQuery: vi.fn(),
}));

const NO_FILTERS = { search: '', departmentId: '', countryId: '', jobLevelId: '' };

function mockEmployeesQueryResult(overrides) {
  useEmployeesQuery.mockReturnValue({
    data: { items: [], total: 0 },
    isLoading: false,
    isError: false,
    ...overrides,
  });
}

describe('rendering the employee directory table', () => {
  it('renders a row for each employee in a populated result', () => {
    mockEmployeesQueryResult({
      data: {
        items: [
          {
            id: 1,
            firstName: 'Jane',
            lastName: 'Doe',
            departmentName: 'Engineering',
            countryName: 'Germany',
            jobLevelLabel: 'Staff',
            salaryMajorUnits: 95000,
            currencyCode: 'EUR',
            hireDate: '2021-03-01',
          },
          {
            id: 2,
            firstName: 'John',
            lastName: 'Smith',
            departmentName: 'Sales',
            countryName: 'United States',
            jobLevelLabel: 'Professional',
            salaryMajorUnits: 62000,
            currencyCode: 'USD',
            hireDate: '2022-07-15',
          },
        ],
        total: 2,
      },
    });

    render(<DirectoryTable filters={NO_FILTERS} />);

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('John Smith')).toBeInTheDocument();
  });

  it('renders the empty state when no employees match', () => {
    mockEmployeesQueryResult({ data: { items: [], total: 0 } });

    render(<DirectoryTable filters={NO_FILTERS} />);

    expect(screen.getByText('No employees match your search.')).toBeInTheDocument();
  });
});
