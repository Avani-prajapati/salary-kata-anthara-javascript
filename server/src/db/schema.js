'use strict';

function createSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS countries (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      iso_code TEXT NOT NULL UNIQUE,
      default_currency_code TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS job_levels (
      id INTEGER PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      rank INTEGER NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      department_id INTEGER NOT NULL REFERENCES departments(id),
      country_id INTEGER NOT NULL REFERENCES countries(id),
      job_level_id INTEGER NOT NULL REFERENCES job_levels(id),
      currency_code TEXT NOT NULL,
      salary_minor_units INTEGER NOT NULL CHECK (salary_minor_units >= 0),
      hire_date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_employees_department_id ON employees(department_id);
    CREATE INDEX IF NOT EXISTS idx_employees_country_id ON employees(country_id);
    CREATE INDEX IF NOT EXISTS idx_employees_job_level_id ON employees(job_level_id);
    CREATE INDEX IF NOT EXISTS idx_employees_last_name ON employees(last_name);
    CREATE INDEX IF NOT EXISTS idx_employees_salary_minor_units ON employees(salary_minor_units);
  `);
}

function resetSchema(db) {
  db.exec(`
    DROP TABLE IF EXISTS employees;
    DROP TABLE IF EXISTS job_levels;
    DROP TABLE IF EXISTS countries;
    DROP TABLE IF EXISTS departments;
  `);
  createSchema(db);
}

module.exports = { createSchema, resetSchema };
