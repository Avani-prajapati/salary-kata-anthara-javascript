import { requestWithQuery } from './httpClient';

export function getEmployees(params) {
  return requestWithQuery('/api/employees', params);
}
