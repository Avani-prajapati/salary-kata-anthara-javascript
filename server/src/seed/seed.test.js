'use strict';

const { describe, it, expect, beforeEach } = await import('vitest');
const { createConnection } = require('../db/connection');
const { runSeed } = require('./seed');

describe('seeding the database with employees', () => {
  let db;

  beforeEach(() => {
    db = createConnection(':memory:');
  });

  it('creates exactly the fixed reference-data counts and 10,000 employees', async () => {
    await runSeed(db);

    expect(db.prepare('SELECT COUNT(*) AS count FROM departments').get().count).toBe(8);
    expect(db.prepare('SELECT COUNT(*) AS count FROM countries').get().count).toBe(6);
    expect(db.prepare('SELECT COUNT(*) AS count FROM job_levels').get().count).toBe(6);
    expect(db.prepare('SELECT COUNT(*) AS count FROM employees').get().count).toBe(10000);
  });

  it('assigns every employee the currency of their own country', async () => {
    await runSeed(db);

    const mismatchedCurrencyCount = db
      .prepare(
        `SELECT COUNT(*) AS count
         FROM employees e
         JOIN countries c ON c.id = e.country_id
         WHERE e.currency_code != c.default_currency_code`
      )
      .get().count;

    expect(mismatchedCurrencyCount).toBe(0);
  });

  it('produces an identical employee count and salary total when run a second time', async () => {
    await runSeed(db);
    const firstRunEmployeeCount = db.prepare('SELECT COUNT(*) AS count FROM employees').get().count;
    const firstRunSalaryTotal = db.prepare('SELECT SUM(salary_minor_units) AS total FROM employees').get().total;

    await runSeed(db);
    const secondRunEmployeeCount = db.prepare('SELECT COUNT(*) AS count FROM employees').get().count;
    const secondRunSalaryTotal = db.prepare('SELECT SUM(salary_minor_units) AS total FROM employees').get().total;

    expect(secondRunEmployeeCount).toBe(firstRunEmployeeCount);
    expect(secondRunSalaryTotal).toBe(firstRunSalaryTotal);
  });
});
