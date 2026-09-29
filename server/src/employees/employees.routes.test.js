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
    'Germany',
    'DE',
    'EUR'
  );
  db.prepare('INSERT INTO job_levels (id, code, label, rank) VALUES (?, ?, ?, ?)').run(1, 'L4', 'Staff', 4);
  db.prepare(
    `INSERT INTO employees (
      first_name, last_name, email, department_id, country_id, job_level_id,
      currency_code, salary_minor_units, hire_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run('Jane', 'Doe', 'jane.doe@acme.example', 1, 1, 1, 'EUR', 9500000, '2021-03-01');
}

describe('exporting the employee directory as CSV', () => {
  let app;

  beforeEach(() => {
    const db = createConnection(':memory:');
    createSchema(db);
    seedOneEmployee(db);
    app = createApp(db);
  });

  it('sets a Content-Disposition attachment header so the browser downloads the file', async () => {
    const response = await request(app).get('/api/employees/export');

    expect(response.headers['content-disposition']).toMatch(/^attachment; filename="/);
  });

  it('exports the salary in major units with the currency as a separate column', async () => {
    const response = await request(app).get('/api/employees/export');

    const [, dataLine] = response.text.trim().split('\r\n');
    const columns = dataLine.split(',');

    expect(columns).toContain('95000.00');
    expect(columns).toContain('EUR');
  });

  it('honors the active filters so the export contains only matching rows', async () => {
    const response = await request(app).get('/api/employees/export').query({ search: 'Nobody' });

    const lines = response.text.trim().split('\r\n');

    expect(lines).toHaveLength(1);
  });
});
