import { requestWithQuery } from './httpClient';

export function getCompensationStats(groupBy) {
  return requestWithQuery('/api/reports/compensation-stats', { groupBy });
}

export function getHeadcount(groupBy) {
  return requestWithQuery('/api/reports/headcount', { groupBy });
}

export function getSalaryDistribution(currencyCode) {
  return requestWithQuery('/api/reports/salary-distribution', { currency: currencyCode });
}
