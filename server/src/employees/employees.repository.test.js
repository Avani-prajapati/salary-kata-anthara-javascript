'use strict';

const { describe, it, expect, beforeEach } = await import('vitest');
const { createConnection } = require('../db/connection');
const { createSchema } = require('../db/schema');
const { findMany } = require('./employees.repository');

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
