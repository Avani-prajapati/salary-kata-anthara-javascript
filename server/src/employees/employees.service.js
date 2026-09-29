'use strict';

const { findMany, findById, create, update, remove } = require('./employees.repository');
const { findCountryById } = require('../lookups/lookups.repository');
const { NotFoundError, ValidationError } = require('../shared/errors');
const { toMinorUnits, toMajorUnits } = require('../shared/money');

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const DEFAULT_SORT_BY = 'lastName';
const DEFAULT_SORT_DIR = 'asc';
const ALLOWED_SORT_BY_VALUES = ['lastName', 'firstName', 'department', 'country', 'jobLevel', 'salary', 'hireDate'];
const ALLOWED_SORT_DIR_VALUES = ['asc', 'desc'];
const REQUIRED_EMPLOYEE_FIELDS = [
  'firstName',
  'lastName',
  'email',
  'departmentId',
  'countryId',
  'jobLevelId',
  'salaryMajorUnits',
  'hireDate',
];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  return { ...rest, salaryMajorUnits: toMajorUnits(salaryMinorUnits) };
}

function parseEmployeeFilters(queryParams) {
  return {
    search: queryParams.search || undefined,
    departmentId: toOptionalId(queryParams.department),
    countryId: toOptionalId(queryParams.country),
    jobLevelId: toOptionalId(queryParams.jobLevel),
  };
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
    ...parseEmployeeFilters(queryParams),
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

function isPresent(value) {
  return value !== undefined && value !== null && value !== '';
}

function collectMissingFieldErrors(input, fieldsToCheck) {
  return fieldsToCheck.filter((field) => !isPresent(input[field])).map((field) => ({
    field,
    message: `${field} is required`,
  }));
}

function collectFormatFieldErrors(input) {
  const errors = [];

  if (isPresent(input.email) && !EMAIL_PATTERN.test(input.email)) {
    errors.push({ field: 'email', message: 'email must be a valid email address' });
  }

  if (isPresent(input.salaryMajorUnits) && !(Number(input.salaryMajorUnits) > 0)) {
    errors.push({ field: 'salaryMajorUnits', message: 'salaryMajorUnits must be greater than 0' });
  }

  return errors;
}

function validateFields(input, requiredFieldsToCheck) {
  const missingFieldErrors = collectMissingFieldErrors(input, requiredFieldsToCheck);
  const fieldsAlreadyReported = new Set(missingFieldErrors.map((error) => error.field));
  const formatFieldErrors = collectFormatFieldErrors(input).filter(
    (error) => !fieldsAlreadyReported.has(error.field)
  );
  const fields = [...missingFieldErrors, ...formatFieldErrors];

  if (fields.length > 0) {
    throw new ValidationError(fields);
  }
}

function validateEmployeeInput(input) {
  validateFields(input, REQUIRED_EMPLOYEE_FIELDS);
}

function fieldsPresentIn(patch) {
  return REQUIRED_EMPLOYEE_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(patch, field));
}

function validateEmployeePatch(patch) {
  validateFields(patch, fieldsPresentIn(patch));
}

function guardAgainstCountryChange(patch, currentCountryId) {
  const isChangingCountry =
    Object.prototype.hasOwnProperty.call(patch, 'countryId') && Number(patch.countryId) !== currentCountryId;

  if (isChangingCountry) {
    throw new ValidationError(
      [{ field: 'countryId', message: 'Country cannot be changed on this endpoint' }],
      'COUNTRY_CHANGE_NOT_SUPPORTED'
    );
  }
}

function toEmployeeUpdateRow(patch) {
  const row = {};

  fieldsPresentIn(patch)
    .filter((field) => field !== 'salaryMajorUnits')
    .forEach((field) => {
      row[field] = patch[field];
    });

  if (Object.prototype.hasOwnProperty.call(patch, 'salaryMajorUnits')) {
    row.salaryMinorUnits = toMinorUnits(Number(patch.salaryMajorUnits));
  }

  return row;
}

function resolveCurrencyCode(db, countryId) {
  const country = findCountryById(db, countryId);
  if (!country) {
    throw new ValidationError([{ field: 'countryId', message: 'countryId does not match a known country' }]);
  }
  return country.defaultCurrencyCode;
}

function createEmployee(db, input) {
  validateEmployeeInput(input);

  const id = create(db, {
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    departmentId: input.departmentId,
    countryId: input.countryId,
    jobLevelId: input.jobLevelId,
    currencyCode: resolveCurrencyCode(db, input.countryId),
    salaryMinorUnits: toMinorUnits(Number(input.salaryMajorUnits)),
    hireDate: input.hireDate,
  });

  return getEmployee(db, id);
}

function updateEmployee(db, id, patch) {
  const existing = getEmployee(db, id);

  guardAgainstCountryChange(patch, existing.countryId);
  validateEmployeePatch(patch);

  update(db, id, toEmployeeUpdateRow(patch));

  return getEmployee(db, id);
}

function deleteEmployee(db, id) {
  getEmployee(db, id);
  remove(db, id);
}

module.exports = {
  listEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  parseEmployeeFilters,
};
