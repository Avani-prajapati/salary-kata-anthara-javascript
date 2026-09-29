import { request, requestWithQuery } from './httpClient';

export function getEmployees(params) {
  return requestWithQuery('/api/employees', params);
}

export function getEmployee(id) {
  return request(`/api/employees/${id}`);
}
