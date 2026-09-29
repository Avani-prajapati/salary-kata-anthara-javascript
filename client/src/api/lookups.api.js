import { request } from './httpClient';

export function getDepartments() {
  return request('/api/departments');
}

export function getCountries() {
  return request('/api/countries');
}

export function getJobLevels() {
  return request('/api/job-levels');
}
