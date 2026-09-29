import { request, requestWithQuery } from './httpClient';

export function getEmployees(params) {
  return requestWithQuery('/api/employees', params);
}

export function getEmployee(id) {
  return request(`/api/employees/${id}`);
}

export function createEmployee(payload) {
  return request('/api/employees', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateEmployee(id, payload) {
  return request(`/api/employees/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export function deleteEmployee(id) {
  return request(`/api/employees/${id}`, { method: 'DELETE' });
}
