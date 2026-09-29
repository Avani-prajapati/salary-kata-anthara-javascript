'use strict';

const { findMany, findById } = require('./employees.repository');
const { NotFoundError } = require('../shared/errors');

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const DEFAULT_SORT_BY = 'lastName';
const DEFAULT_SORT_DIR = 'asc';
const MINOR_UNITS_PER_MAJOR_UNIT = 100;
const ALLOWED_SORT_BY_VALUES = ['lastName', 'firstName', 'department', 'country', 'jobLevel', 'salary', 'hireDate'];
const ALLOWED_SORT_DIR_VALUES = ['asc', 'desc'];

function toBoundedInteger(value, { fallback, min, max }) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) {
    return fallback;
  }
  return Math.min(Math.max(parsed, min), max);
}

function toOptionalId(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : undefined;
}

function toEnumValue(value, allowedValues, fallback) {
  return allowedValues.includes(value) ? value : fallback;
}

function toEmployeeDto({ salaryMinorUnits, ...rest }) {
  return { ...rest, salaryMajorUnits: salaryMinorUnits / MINOR_UNITS_PER_MAJOR_UNIT };
}

function listEmployees(db, queryParams) {
  const page = toBoundedInteger(queryParams.page, { fallback: DEFAULT_PAGE, min: 1, max: Number.MAX_SAFE_INTEGER });
  const pageSize = toBoundedInteger(queryParams.pageSize, { fallback: DEFAULT_PAGE_SIZE, min: 1, max: MAX_PAGE_SIZE });
  const sortBy = toEnumValue(queryParams.sortBy, ALLOWED_SORT_BY_VALUES, DEFAULT_SORT_BY);
  const sortDir = toEnumValue(queryParams.sortDir, ALLOWED_SORT_DIR_VALUES, DEFAULT_SORT_DIR);

  const { items, total } = findMany(db, {
    page,
    pageSize,
    sortBy,
    sortDir,
    search: queryParams.search || undefined,
    departmentId: toOptionalId(queryParams.department),
    countryId: toOptionalId(queryParams.country),
    jobLevelId: toOptionalId(queryParams.jobLevel),
  });

  return { items: items.map(toEmployeeDto), total, page, pageSize };
}

function getEmployee(db, id) {
  const employee = Number.isInteger(id) ? findById(db, id) : undefined;
  if (!employee) {
    throw new NotFoundError('Employee', id);
  }
  return toEmployeeDto(employee);
}

module.exports = { listEmployees, getEmployee };
