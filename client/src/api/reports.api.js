import { requestWithQuery } from './httpClient';

export function getCompensationStats(groupBy) {
  return requestWithQuery('/api/reports/compensation-stats', { groupBy });
}
