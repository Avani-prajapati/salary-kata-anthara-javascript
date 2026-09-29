import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HeadcountReportsPage } from './HeadcountReportsPage';
import { useHeadcountQuery } from './useHeadcountQuery';
import { useSalaryDistributionQuery } from './useSalaryDistributionQuery';

vi.mock('./useHeadcountQuery', () => ({
  useHeadcountQuery: vi.fn(),
}));

vi.mock('./useSalaryDistributionQuery', () => ({
  useSalaryDistributionQuery: vi.fn(),
}));

vi.mock('../../api/lookups.api', () => ({
  getCountries: vi.fn().mockResolvedValue([]),
}));

afterEach(cleanup);

function mockQueries({ distributionData = null, distributionLoading = false } = {}) {
  useHeadcountQuery.mockReturnValue({ data: [], isLoading: false, isError: false });
  useSalaryDistributionQuery.mockReturnValue({
    data: distributionData,
    isLoading: distributionLoading,
    isError: false,
  });
}

function renderHeadcountReportsPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <HeadcountReportsPage />
    </QueryClientProvider>
  );
}

describe('announcing the resolved salary-distribution currency to assistive technology', () => {
  it('exposes the currency status text as a live region while it changes', () => {
    mockQueries({ distributionData: { currencyCode: 'USD', buckets: [] } });

    renderHeadcountReportsPage();

    const status = screen.getByText('Showing salaries in USD.');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('announces the resolving state before the default currency is known', () => {
    mockQueries({ distributionData: null, distributionLoading: true });

    renderHeadcountReportsPage();

    const status = screen.getByText('Resolving the default currency…');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });
});
