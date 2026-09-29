'use strict';

const { describe, it, expect, beforeEach } = await import('vitest');
const request = require('supertest');
const { createConnection } = require('../db/connection');
const { createSchema } = require('../db/schema');
const { createApp } = require('../app');

function seedOneEmployee(db) {
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

describe('exporting report data as CSV', () => {
  let app;

  beforeEach(() => {
    const db = createConnection(':memory:');
    createSchema(db);
    seedOneEmployee(db);
    app = createApp(db);
  });

  it('streams a compensation-stats CSV with a download header and a major-unit average column', async () => {
    const response = await request(app).get('/api/reports/compensation-stats/export').query({ groupBy: 'department' });

    expect(response.headers['content-disposition']).toMatch(/^attachment; filename="/);
    const [, dataLine] = response.text.trim().split('\r\n');
    expect(dataLine.split(',')).toContain('95000.00');
  });

  it('streams a headcount CSV with a download header', async () => {
    const response = await request(app).get('/api/reports/headcount/export').query({ groupBy: 'department' });

    expect(response.headers['content-disposition']).toMatch(/^attachment; filename="/);
    const [, dataLine] = response.text.trim().split('\r\n');
    expect(dataLine).toBe('Engineering,1');
  });
});
