'use strict';

const { describe, it, expect, beforeEach } = await import('vitest');
const { getEmployee, createEmployee, updateEmployee } = require('./employees.service');
const { NotFoundError, ValidationError } = require('../shared/errors');
const { createConnection } = require('../db/connection');
const { createSchema } = require('../db/schema');

const EMPLOYEE_ROW = {
  id: 7,
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane.doe@acme.example',
  departmentId: 1,
  departmentName: 'Engineering',
  countryId: 2,
  countryName: 'Germany',
  countryIsoCode: 'DE',
  jobLevelId: 4,
  jobLevelCode: 'L4',
  jobLevelLabel: 'Staff',
  currencyCode: 'EUR',
  salaryMinorUnits: 9500000,
  hireDate: '2021-03-01',
};

function createFakeRepositoryDb(row) {
  return { prepare: () => ({ get: () => row }) };
}

describe('getting a single employee by id', () => {
  it('returns the mapped employee record when the id exists', () => {
    const db = createFakeRepositoryDb(EMPLOYEE_ROW);
    const { salaryMinorUnits, ...rest } = EMPLOYEE_ROW;

    expect(getEmployee(db, 7)).toEqual({ ...rest, salaryMajorUnits: 95000 });
  });

  it('throws a NotFoundError naming the employee and the missing id when no record matches', () => {
    const db = createFakeRepositoryDb(undefined);

    expect(() => getEmployee(db, 404)).toThrow(NotFoundError);
    expect(() => getEmployee(db, 404)).toThrow(/404/);
  });
});

const VALID_CREATE_INPUT = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane.doe@acme.example',
  departmentId: 1,
  countryId: 1,
  jobLevelId: 1,
  salaryMajorUnits: 95000,
  hireDate: '2021-03-01',
};

function seedReferenceData(db) {
  db.prepare('INSERT INTO departments (id, name) VALUES (?, ?)').run(1, 'Engineering');
  db.prepare('INSERT INTO countries (id, name, iso_code, default_currency_code) VALUES (?, ?, ?, ?)').run(
    1,
    'Germany',
    'DE',
    'EUR'
  );
  db.prepare('INSERT INTO countries (id, name, iso_code, default_currency_code) VALUES (?, ?, ?, ?)').run(
    2,
    'United States',
    'US',
    'USD'
  );
  db.prepare('INSERT INTO job_levels (id, code, label, rank) VALUES (?, ?, ?, ?)').run(1, 'L4', 'Staff', 4);
}

function captureThrownError(action) {
  try {
    action();
    return undefined;
  } catch (error) {
    return error;
  }
}

describe('creating a new employee', () => {
  let db;

  beforeEach(() => {
    db = createConnection(':memory:');
    createSchema(db);
    seedReferenceData(db);
  });

  it('creates the employee, converting the major-unit salary to minor units exactly', () => {
    const created = createEmployee(db, VALID_CREATE_INPUT);
    const storedRow = db
      .prepare('SELECT salary_minor_units AS salaryMinorUnits FROM employees WHERE id = ?')
      .get(created.id);

    expect(created.salaryMajorUnits).toBe(95000);
    expect(storedRow.salaryMinorUnits).toBe(9500000);
  });

  it("sets currencyCode from the chosen country's default currency", () => {
    const created = createEmployee(db, VALID_CREATE_INPUT);

    expect(created.currencyCode).toBe('EUR');
  });

  it.each(Object.keys(VALID_CREATE_INPUT))(
    'throws a ValidationError naming %s when it is missing',
    (missingField) => {
      const { [missingField]: _omitted, ...incompleteInput } = VALID_CREATE_INPUT;

      const error = captureThrownError(() => createEmployee(db, incompleteInput));

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.fields.map((field) => field.field)).toContain(missingField);
    }
  );

  it('collects every invalid field into one ValidationError instead of stopping at the first failure', () => {
    const invalidInput = { ...VALID_CREATE_INPUT, firstName: '', email: 'not-an-email', salaryMajorUnits: -5 };

    const error = captureThrownError(() => createEmployee(db, invalidInput));

    expect(error).toBeInstanceOf(ValidationError);
    expect(error.fields.map((field) => field.field)).toEqual(
      expect.arrayContaining(['firstName', 'email', 'salaryMajorUnits'])
    );
  });
});

describe('updating an existing employee', () => {
  let db;
  let employeeId;

  beforeEach(() => {
    db = createConnection(':memory:');
    createSchema(db);
    seedReferenceData(db);
    employeeId = createEmployee(db, VALID_CREATE_INPUT).id;
  });

  it('applies a salary-only patch and returns the new value', () => {
    const updated = updateEmployee(db, employeeId, { salaryMajorUnits: 120000 });

    expect(updated.salaryMajorUnits).toBe(120000);
    expect(getEmployee(db, employeeId).salaryMajorUnits).toBe(120000);
  });

  it('rejects a patch that changes countryId with a COUNTRY_CHANGE_NOT_SUPPORTED error', () => {
    const error = captureThrownError(() => updateEmployee(db, employeeId, { countryId: 2 }));

    expect(error).toBeInstanceOf(ValidationError);
    expect(error.code).toBe('COUNTRY_CHANGE_NOT_SUPPORTED');
    expect(error.fields).toEqual([{ field: 'countryId', message: 'Country cannot be changed on this endpoint' }]);
  });

  it('throws a NotFoundError when patching an employee id that does not exist', () => {
    expect(() => updateEmployee(db, 999999, { salaryMajorUnits: 1000 })).toThrow(NotFoundError);
  });

  it('throws the same field-shaped error as create when the patched email is malformed', () => {
    const error = captureThrownError(() => updateEmployee(db, employeeId, { email: 'not-an-email' }));

    expect(error).toBeInstanceOf(ValidationError);
    expect(error.fields).toEqual([{ field: 'email', message: 'email must be a valid email address' }]);
  });
});
