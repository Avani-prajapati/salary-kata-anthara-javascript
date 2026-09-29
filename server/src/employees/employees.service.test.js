'use strict';

const { describe, it, expect } = await import('vitest');
const { getEmployee } = require('./employees.service');
const { NotFoundError } = require('../shared/errors');

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
