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
  db.prepare('INSERT INTO countries (id, name, iso_code, default_currency_code) VALUES (?, ?, ?, ?)').run(
    2,
    'United States',
    'US',
    'USD'
  );
  db.prepare('INSERT INTO job_levels (id, code, label, rank) VALUES (?, ?, ?, ?)').run(1, 'L4', 'Staff', 4);
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO employees (
      first_name, last_name, email, department_id, country_id, job_level_id,
      currency_code, salary_minor_units, hire_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run('Jane', 'Doe', 'jane.doe@acme.example', 1, 1, 1, 'EUR', 9500000, '2021-03-01');

  return lastInsertRowid;
}

const VALID_NEW_EMPLOYEE_PAYLOAD = {
  firstName: 'John',
  lastName: 'Smith',
  email: 'john.smith@acme.example',
  departmentId: 1,
  countryId: 1,
  jobLevelId: 1,
  salaryMajorUnits: 62000,
  hireDate: '2022-07-01',
};

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

describe('fetching a single employee over HTTP', () => {
  let app;
  let employeeId;

  beforeEach(() => {
    const db = createConnection(':memory:');
    createSchema(db);
    employeeId = seedOneEmployee(db);
    app = createApp(db);
  });

  it('returns the full employee record with a 200 when the id exists', async () => {
    const response = await request(app).get(`/api/employees/${employeeId}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: employeeId,
      firstName: 'Jane',
      lastName: 'Doe',
      currencyCode: 'EUR',
      salaryMajorUnits: 95000,
    });
  });

  it('returns a 404 with the EMPLOYEE_NOT_FOUND shape when the id does not exist', async () => {
    const response = await request(app).get('/api/employees/999999');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ code: 'EMPLOYEE_NOT_FOUND' });
    expect(response.body.message).toEqual(expect.any(String));
  });
});

describe('creating an employee over HTTP', () => {
  let app;

  beforeEach(() => {
    const db = createConnection(':memory:');
    createSchema(db);
    seedOneEmployee(db);
    app = createApp(db);
  });

  it('creates the employee and returns it with a 201', async () => {
    const response = await request(app).post('/api/employees').send(VALID_NEW_EMPLOYEE_PAYLOAD);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      firstName: 'John',
      lastName: 'Smith',
      currencyCode: 'EUR',
      salaryMajorUnits: 62000,
    });
  });

  it('returns a 422 with the fields shape when required fields are missing', async () => {
    const { firstName, ...incompletePayload } = VALID_NEW_EMPLOYEE_PAYLOAD;

    const response = await request(app).post('/api/employees').send(incompletePayload);

    expect(response.status).toBe(422);
    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(response.body.fields).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'firstName' })])
    );
  });
});

describe('updating an employee over HTTP', () => {
  let app;
  let employeeId;

  beforeEach(() => {
    const db = createConnection(':memory:');
    createSchema(db);
    employeeId = seedOneEmployee(db);
    app = createApp(db);
  });

  it('applies a partial update and returns the updated record with a 200', async () => {
    const response = await request(app)
      .patch(`/api/employees/${employeeId}`)
      .send({ salaryMajorUnits: 120000 });

    expect(response.status).toBe(200);
    expect(response.body.salaryMajorUnits).toBe(120000);
  });

  it('rejects a country change with a 422 and COUNTRY_CHANGE_NOT_SUPPORTED', async () => {
    const response = await request(app).patch(`/api/employees/${employeeId}`).send({ countryId: 2 });

    expect(response.status).toBe(422);
    expect(response.body.code).toBe('COUNTRY_CHANGE_NOT_SUPPORTED');
  });

  it('returns a 404 with the EMPLOYEE_NOT_FOUND shape for a non-existent id', async () => {
    const response = await request(app).patch('/api/employees/999999').send({ salaryMajorUnits: 1000 });

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ code: 'EMPLOYEE_NOT_FOUND' });
  });
});

describe('deleting an employee over HTTP', () => {
  let app;
  let employeeId;

  beforeEach(() => {
    const db = createConnection(':memory:');
    createSchema(db);
    employeeId = seedOneEmployee(db);
    app = createApp(db);
  });

  it('removes the record and returns a 204', async () => {
    const response = await request(app).delete(`/api/employees/${employeeId}`);

    expect(response.status).toBe(204);

    const followUp = await request(app).get(`/api/employees/${employeeId}`);
    expect(followUp.status).toBe(404);
  });

  it('returns a 404 with the EMPLOYEE_NOT_FOUND shape for a non-existent id', async () => {
    const response = await request(app).delete('/api/employees/999999');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ code: 'EMPLOYEE_NOT_FOUND' });
  });
});
