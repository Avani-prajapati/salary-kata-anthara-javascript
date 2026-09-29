'use strict';

const { describe, it, expect, beforeEach } = await import('vitest');
const { getCompensationStats } = require('./reports.service');
const { ValidationError } = require('../shared/errors');
const { createConnection } = require('../db/connection');
const { createSchema } = require('../db/schema');

function seedSingleGroupFixture(db) {
  db.prepare('INSERT INTO departments (id, name) VALUES (?, ?)').run(1, 'Engineering');
  db.prepare('INSERT INTO countries (id, name, iso_code, default_currency_code) VALUES (?, ?, ?, ?)').run(
    1,
    'United States',
    'US',
    'USD'
  );
  db.prepare('INSERT INTO job_levels (id, code, label, rank) VALUES (?, ?, ?, ?)').run(1, 'L1', 'Associate', 1);
  db.prepare(
    `INSERT INTO employees (
      first_name, last_name, email, department_id, country_id, job_level_id,
      currency_code, salary_minor_units, hire_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run('Jane', 'Doe', 'jane.doe@acme.example', 1, 1, 1, 'USD', 9500000, '2021-03-01');
}

describe('validating the groupBy dimension before querying compensation stats', () => {
  it('throws a ValidationError naming groupBy for a value outside department, country, or jobLevel', () => {
    const dbThatThrowsIfQueried = {
      prepare: () => {
        throw new Error('the repository must not be queried for an invalid groupBy');
      },
    };

    const error = (() => {
      try {
        getCompensationStats(dbThatThrowsIfQueried, 'salary');
        return undefined;
      } catch (thrown) {
        return thrown;
      }
    })();

    expect(error).toBeInstanceOf(ValidationError);
    expect(error.fields.map((field) => field.field)).toEqual(['groupBy']);
  });
});

describe('mapping compensation statistics to major-unit fields', () => {
  let db;

  beforeEach(() => {
    db = createConnection(':memory:');
    createSchema(db);
    seedSingleGroupFixture(db);
  });

  it('converts every minor-unit statistic to its major-unit counterpart', () => {
    const [stat] = getCompensationStats(db, 'department');

    expect(stat.avgMajorUnits).toBe(95000);
    expect(stat.medianMajorUnits).toBe(95000);
    expect(stat.minMajorUnits).toBe(95000);
    expect(stat.maxMajorUnits).toBe(95000);
    expect(stat.count).toBe(1);
  });
});
