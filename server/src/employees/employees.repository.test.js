'use strict';

const { describe, it, expect, beforeEach } = await import('vitest');
const { createConnection } = require('../db/connection');
const { createSchema } = require('../db/schema');
const { runSeed } = require('../seed/seed');
const {
  findMany,
  getCompensationStats,
  getHeadcount,
  getSalaryDistribution,
  getDefaultDistributionCurrency,
} = require('./employees.repository');

const BASE_PARAMS = { page: 1, pageSize: 20, sortBy: 'lastName', sortDir: 'asc' };

function seedFixture(db) {
  const insertDepartment = db.prepare('INSERT INTO departments (id, name) VALUES (?, ?)');
  insertDepartment.run(1, 'Engineering');
  insertDepartment.run(2, 'Sales');

  const insertCountry = db.prepare(
    'INSERT INTO countries (id, name, iso_code, default_currency_code) VALUES (?, ?, ?, ?)'
  );
  insertCountry.run(1, 'United States', 'US', 'USD');
  insertCountry.run(2, 'Germany', 'DE', 'EUR');

  const insertJobLevel = db.prepare('INSERT INTO job_levels (id, code, label, rank) VALUES (?, ?, ?, ?)');
  insertJobLevel.run(1, 'L1', 'Associate', 1);
  insertJobLevel.run(2, 'L2', 'Professional', 2);

  const insertEmployee = db.prepare(`
    INSERT INTO employees (
      first_name, last_name, email, department_id, country_id, job_level_id,
      currency_code, salary_minor_units, hire_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertEmployee.run('Alice', 'Anderson', 'alice.anderson@acme.example', 1, 1, 1, 'USD', 5000000, '2020-01-15');
  insertEmployee.run('Bob', 'Baker', 'bob.baker@acme.example', 2, 2, 2, 'EUR', 8000000, '2021-03-10');
  insertEmployee.run('Carol', 'Carter', 'carol.carter@acme.example', 1, 2, 1, 'EUR', 6000000, '2019-07-22');
  insertEmployee.run('Dave', 'Davis', 'dave.davis@acme.example', 2, 1, 2, 'USD', 7000000, '2022-11-05');
}

describe('finding employees for the directory', () => {
  let db;

  beforeEach(() => {
    db = createConnection(':memory:');
    createSchema(db);
    seedFixture(db);
  });

  it('matches a search term case-insensitively against first or last name', () => {
    const { items } = findMany(db, { ...BASE_PARAMS, search: 'ALICE' });

    expect(items.map((item) => item.lastName)).toEqual(['Anderson']);
  });

  it('narrows results when department and country filters are combined', () => {
    const { items } = findMany(db, { ...BASE_PARAMS, departmentId: 1, countryId: 2 });

    expect(items.map((item) => item.lastName)).toEqual(['Carter']);
  });

  it('reorders results when sorting by salary', () => {
    const ascending = findMany(db, { ...BASE_PARAMS, sortBy: 'salary', sortDir: 'asc' });
    const descending = findMany(db, { ...BASE_PARAMS, sortBy: 'salary', sortDir: 'desc' });

    expect(ascending.items.map((item) => item.lastName)).toEqual(['Anderson', 'Carter', 'Davis', 'Baker']);
    expect(descending.items.map((item) => item.lastName)).toEqual(['Baker', 'Davis', 'Carter', 'Anderson']);
  });

  it('returns empty items with the correct total for a page beyond the last page', () => {
    const { items, total } = findMany(db, { ...BASE_PARAMS, page: 10, pageSize: 2 });

    expect(items).toEqual([]);
    expect(total).toBe(4);
  });
});

function seedCompensationFixture(db) {
  const insertDepartment = db.prepare('INSERT INTO departments (id, name) VALUES (?, ?)');
  insertDepartment.run(1, 'Engineering');
  insertDepartment.run(2, 'Sales');

  const insertCountry = db.prepare(
    'INSERT INTO countries (id, name, iso_code, default_currency_code) VALUES (?, ?, ?, ?)'
  );
  insertCountry.run(1, 'United States', 'US', 'USD');
  insertCountry.run(2, 'Germany', 'DE', 'EUR');

  const insertJobLevel = db.prepare('INSERT INTO job_levels (id, code, label, rank) VALUES (?, ?, ?, ?)');
  insertJobLevel.run(1, 'L1', 'Associate', 1);

  const insertEmployee = db.prepare(`
    INSERT INTO employees (
      first_name, last_name, email, department_id, country_id, job_level_id,
      currency_code, salary_minor_units, hire_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  let employeeCount = 0;
  function insertEmployeeInGroup(departmentId, countryId, currencyCode, salaryMinorUnits) {
    employeeCount += 1;
    insertEmployee.run(
      `First${employeeCount}`,
      `Last${employeeCount}`,
      `employee${employeeCount}@acme.example`,
      departmentId,
      countryId,
      1,
      currencyCode,
      salaryMinorUnits,
      '2021-01-01'
    );
  }

  [10000, 30000, 20000].forEach((salaryMinorUnits) => insertEmployeeInGroup(1, 1, 'USD', salaryMinorUnits));
  [10000, 20000, 30000, 40000].forEach((salaryMinorUnits) => insertEmployeeInGroup(2, 1, 'USD', salaryMinorUnits));
  insertEmployeeInGroup(1, 2, 'EUR', 50000);
}

describe('computing compensation statistics grouped by dimension and currency', () => {
  let db;

  beforeEach(() => {
    db = createConnection(':memory:');
    createSchema(db);
    seedCompensationFixture(db);
  });

  function findStatRow(stats, groupLabel, currencyCode) {
    return stats.find((row) => row.groupLabel === groupLabel && row.currencyCode === currencyCode);
  }

  it("computes an odd-sized group's median as its literal middle value", () => {
    const stats = getCompensationStats(db, 'department');
    const engineeringUsd = findStatRow(stats, 'Engineering', 'USD');

    expect(engineeringUsd.count).toBe(3);
    expect(engineeringUsd.medianMinor).toBe(20000);
  });

  it("computes an even-sized group's median as the average of its two middle values", () => {
    const stats = getCompensationStats(db, 'department');
    const salesUsd = findStatRow(stats, 'Sales', 'USD');

    expect(salesUsd.count).toBe(4);
    expect(salesUsd.medianMinor).toBe(25000);
  });

  it('keeps a department present in two countries with two currencies as two separate rows, never blended', () => {
    const stats = getCompensationStats(db, 'department');
    const engineeringRows = stats.filter((row) => row.groupLabel === 'Engineering');

    expect(engineeringRows.map((row) => row.currencyCode).sort()).toEqual(['EUR', 'USD']);
    expect(findStatRow(stats, 'Engineering', 'EUR').count).toBe(1);
    expect(findStatRow(stats, 'Engineering', 'USD').count).toBe(3);
  });

  it('computes min, max, and average alongside the median for the same group', () => {
    const stats = getCompensationStats(db, 'department');
    const engineeringUsd = findStatRow(stats, 'Engineering', 'USD');

    expect(engineeringUsd.minMinor).toBe(10000);
    expect(engineeringUsd.maxMinor).toBe(30000);
    expect(engineeringUsd.avgMinor).toBe(20000);
  });
});

describe('counting headcount per dimension group, independent of currency', () => {
  let db;

  beforeEach(() => {
    db = createConnection(':memory:');
    createSchema(db);
    seedCompensationFixture(db);
  });

  it('sums headcount rows to the total employee count when grouping by department', () => {
    const headcount = getHeadcount(db, 'department');
    const { count: totalEmployees } = db.prepare('SELECT COUNT(*) AS count FROM employees').get();

    expect(headcount.reduce((sum, row) => sum + row.count, 0)).toBe(totalEmployees);
  });

  it('blends currencies within a single group rather than splitting by currency', () => {
    const headcount = getHeadcount(db, 'department');
    const engineering = headcount.find((row) => row.groupLabel === 'Engineering');

    expect(engineering.count).toBe(4);
  });
});

function seedSalaryDistributionFixture(db) {
  db.prepare('INSERT INTO departments (id, name) VALUES (?, ?)').run(1, 'Engineering');
  db.prepare('INSERT INTO countries (id, name, iso_code, default_currency_code) VALUES (?, ?, ?, ?)').run(
    1,
    'United States',
    'US',
    'USD'
  );
  db.prepare('INSERT INTO countries (id, name, iso_code, default_currency_code) VALUES (?, ?, ?, ?)').run(
    2,
    'Germany',
    'DE',
    'EUR'
  );
  db.prepare('INSERT INTO job_levels (id, code, label, rank) VALUES (?, ?, ?, ?)').run(1, 'L1', 'Associate', 1);

  const insertEmployee = db.prepare(`
    INSERT INTO employees (
      first_name, last_name, email, department_id, country_id, job_level_id,
      currency_code, salary_minor_units, hire_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  let employeeCount = 0;
  function insertEmployeeWithSalary(countryId, currencyCode, salaryMinorUnits) {
    employeeCount += 1;
    insertEmployee.run(
      `First${employeeCount}`,
      `Last${employeeCount}`,
      `employee${employeeCount}@acme.example`,
      1,
      countryId,
      1,
      currencyCode,
      salaryMinorUnits,
      '2021-01-01'
    );
  }

  [10000, 20000, 30000, 40000, 50000, 60000].forEach((salary) => insertEmployeeWithSalary(1, 'USD', salary));
  [5000, 9000].forEach((salary) => insertEmployeeWithSalary(2, 'EUR', salary));
}

describe('bucketing salaries into a fixed-width, currency-scoped distribution', () => {
  let db;

  beforeEach(() => {
    db = createConnection(':memory:');
    createSchema(db);
    seedSalaryDistributionFixture(db);
  });

  it('only counts employees paid in the requested currency', () => {
    const buckets = getSalaryDistribution(db, 'EUR');

    expect(buckets.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(2);
  });

  it('resolves the default distribution currency to the one with the largest headcount', () => {
    expect(getDefaultDistributionCurrency(db)).toBe('USD');
  });

  it('clamps a salary exactly at the maximum into the last bucket rather than a stray eleventh bucket', () => {
    const buckets = getSalaryDistribution(db, 'USD');

    expect(buckets.some((bucket) => bucket.bucketIndex === 10)).toBe(false);
    expect(buckets.find((bucket) => bucket.bucketIndex === 9).count).toBe(1);
  });

  it('expresses bucket bounds in major units derived from the minor-unit range', () => {
    const buckets = getSalaryDistribution(db, 'USD');
    const firstBucket = buckets.find((bucket) => bucket.bucketIndex === 0);

    expect(firstBucket.bucketMinMajor).toBe(100);
    expect(firstBucket.bucketMaxMajor).toBe(150);
  });
});

function seedUniformSalaryFixture(db) {
  db.prepare('INSERT INTO departments (id, name) VALUES (?, ?)').run(1, 'Engineering');
  db.prepare('INSERT INTO countries (id, name, iso_code, default_currency_code) VALUES (?, ?, ?, ?)').run(
    1,
    'United States',
    'US',
    'USD'
  );
  db.prepare('INSERT INTO job_levels (id, code, label, rank) VALUES (?, ?, ?, ?)').run(1, 'L1', 'Associate', 1);

  const insertEmployee = db.prepare(`
    INSERT INTO employees (
      first_name, last_name, email, department_id, country_id, job_level_id,
      currency_code, salary_minor_units, hire_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  [1, 2, 3].forEach((employeeNumber) =>
    insertEmployee.run(
      `First${employeeNumber}`,
      `Last${employeeNumber}`,
      `employee${employeeNumber}@acme.example`,
      1,
      1,
      1,
      'USD',
      50000,
      '2021-01-01'
    )
  );
}

describe('bucketing a currency where every employee earns the identical salary', () => {
  it('returns a single bucket spanning that value instead of dividing by a zero-width range', () => {
    const db = createConnection(':memory:');
    createSchema(db);
    seedUniformSalaryFixture(db);

    const buckets = getSalaryDistribution(db, 'USD');

    expect(buckets).toEqual([{ bucketIndex: 0, bucketMinMajor: 500, bucketMaxMajor: 500, count: 3 }]);
  });
});

describe('reporting performance against the full seeded dataset', () => {
  it('computes headcount and salary distribution well under the 500ms floor', async () => {
    const db = createConnection(':memory:');
    await runSeed(db);

    const headcountStartedAt = Date.now();
    const headcount = getHeadcount(db, 'department');
    const headcountElapsedMs = Date.now() - headcountStartedAt;

    const distributionStartedAt = Date.now();
    const distribution = getSalaryDistribution(db, 'USD');
    const distributionElapsedMs = Date.now() - distributionStartedAt;

    expect(headcount.reduce((sum, row) => sum + row.count, 0)).toBe(10000);
    expect(distribution.length).toBeGreaterThan(0);
    expect(headcountElapsedMs).toBeLessThan(500);
    expect(distributionElapsedMs).toBeLessThan(500);
  });
});
