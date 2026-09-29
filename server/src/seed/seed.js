'use strict';

const path = require('node:path');
const fs = require('node:fs');
const { createConnection } = require('../db/connection');
const { resetSchema } = require('../db/schema');
const { createSeededRandom } = require('./seededRandom');
const { generateSalaryMinorUnits } = require('./salaryGenerator');

const SEED_RNG_SEED = 42;
const EMPLOYEE_COUNT = 10000;
const HIRE_DATE_WINDOW_DAYS = 8 * 365;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const PROGRESS_LABEL_WIDTH = 34;

const DEPARTMENT_NAMES = [
  'Engineering',
  'Sales',
  'Marketing',
  'Finance',
  'HR',
  'Operations',
  'Legal',
  'Customer Support',
];

const COUNTRIES = [
  { name: 'United States', isoCode: 'US', currencyCode: 'USD' },
  { name: 'United Kingdom', isoCode: 'GB', currencyCode: 'GBP' },
  { name: 'Germany', isoCode: 'DE', currencyCode: 'EUR' },
  { name: 'India', isoCode: 'IN', currencyCode: 'INR' },
  { name: 'Canada', isoCode: 'CA', currencyCode: 'CAD' },
  { name: 'Australia', isoCode: 'AU', currencyCode: 'AUD' },
];

const JOB_LEVELS = [
  { code: 'L1', label: 'Associate', rank: 1 },
  { code: 'L2', label: 'Professional', rank: 2 },
  { code: 'L3', label: 'Senior', rank: 3 },
  { code: 'L4', label: 'Staff', rank: 4 },
  { code: 'L5', label: 'Principal', rank: 5 },
  { code: 'L6', label: 'Executive', rank: 6 },
];

const FIRST_NAMES = [
  'Olivia', 'Liam', 'Emma', 'Noah', 'Ava', 'Elijah', 'Sophia', 'James',
  'Isabella', 'William', 'Mia', 'Benjamin', 'Amelia', 'Lucas', 'Harper',
  'Henry', 'Evelyn', 'Alexander', 'Abigail', 'Michael', 'Emily', 'Daniel',
  'Elizabeth', 'Jacob', 'Sofia', 'Logan', 'Avery', 'Jackson', 'Ella',
  'Sebastian', 'Scarlett', 'Aiden', 'Grace', 'Matthew', 'Chloe', 'Samuel',
  'Victoria', 'David', 'Riley', 'Joseph',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
  'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
  'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark',
  'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King',
  'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
];

function withInsertionOrderIds(records) {
  return records.map((record, index) => ({ id: index + 1, ...record }));
}

function pickUniformly(random, items) {
  return items[Math.floor(random() * items.length)];
}

function createEmailAssigner() {
  const occurrenceCountByBaseKey = new Map();

  return function nextEmail(firstName, lastName) {
    const baseKey = `${firstName}.${lastName}`.toLowerCase();
    const occurrenceCount = occurrenceCountByBaseKey.get(baseKey) ?? 0;
    occurrenceCountByBaseKey.set(baseKey, occurrenceCount + 1);
    const disambiguator = occurrenceCount === 0 ? '' : String(occurrenceCount);
    return `${baseKey}${disambiguator}@acme.example`;
  };
}

function pickHireDate(random, referenceTimestampMs) {
  const offsetDays = Math.floor(random() * HIRE_DATE_WINDOW_DAYS);
  const hireTimestampMs = referenceTimestampMs - offsetDays * MILLISECONDS_PER_DAY;
  return new Date(hireTimestampMs).toISOString().slice(0, 10);
}

function insertReferenceData(db, { departments, countries, jobLevels }) {
  const insertDepartment = db.prepare('INSERT INTO departments (name) VALUES (?)');
  departments.forEach(({ name }) => insertDepartment.run(name));

  const insertCountry = db.prepare(
    'INSERT INTO countries (name, iso_code, default_currency_code) VALUES (?, ?, ?)'
  );
  countries.forEach(({ name, isoCode, currencyCode }) => insertCountry.run(name, isoCode, currencyCode));

  const insertJobLevel = db.prepare('INSERT INTO job_levels (code, label, rank) VALUES (?, ?, ?)');
  jobLevels.forEach(({ code, label, rank }) => insertJobLevel.run(code, label, rank));
}

function insertEmployees(db, { departments, countries, jobLevels, random, count }) {
  const insertEmployee = db.prepare(`
    INSERT INTO employees (
      first_name, last_name, email, department_id, country_id, job_level_id,
      currency_code, salary_minor_units, hire_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const nextEmail = createEmailAssigner();
  const referenceTimestampMs = Date.now();

  for (let inserted = 0; inserted < count; inserted += 1) {
    const firstName = pickUniformly(random, FIRST_NAMES);
    const lastName = pickUniformly(random, LAST_NAMES);
    const department = pickUniformly(random, departments);
    const country = pickUniformly(random, countries);
    const jobLevel = pickUniformly(random, jobLevels);

    const salaryMinorUnits = generateSalaryMinorUnits({
      jobLevelRank: jobLevel.rank,
      countryIsoCode: country.isoCode,
      departmentName: department.name,
      random,
    });

    insertEmployee.run(
      firstName,
      lastName,
      nextEmail(firstName, lastName),
      department.id,
      country.id,
      jobLevel.id,
      country.currencyCode,
      salaryMinorUnits,
      pickHireDate(random, referenceTimestampMs)
    );
  }
}

function logStepDone(label, suffix = 'done') {
  console.log(`${label.padEnd(PROGRESS_LABEL_WIDTH)}${suffix}`);
}

async function runSeed(db) {
  logStepDone('Seeding schema...');
  resetSchema(db);

  const departments = withInsertionOrderIds(DEPARTMENT_NAMES.map((name) => ({ name })));
  const countries = withInsertionOrderIds(COUNTRIES);
  const jobLevels = withInsertionOrderIds(JOB_LEVELS);
  const random = createSeededRandom(SEED_RNG_SEED);

  const seedInTransaction = db.transaction(() => {
    insertReferenceData(db, { departments, countries, jobLevels });
    logStepDone(`Seeding ${departments.length} departments...`);
    logStepDone(`Seeding ${countries.length} countries...`);
    logStepDone(`Seeding ${jobLevels.length} job levels...`);

    const startedAt = Date.now();
    insertEmployees(db, { departments, countries, jobLevels, random, count: EMPLOYEE_COUNT });
    const elapsedMs = Date.now() - startedAt;
    logStepDone(`Seeding ${EMPLOYEE_COUNT.toLocaleString()} employees...`, `done (${elapsedMs.toLocaleString()} ms)`);
  });

  seedInTransaction();

  console.log('Seed complete. Re-run to reset — seeding is idempotent (truncates + re-inserts).');
}

if (require.main === module) {
  const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/employees.db');
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = createConnection(dbPath);

  runSeed(db)
    .then(() => db.close())
    .catch((error) => {
      db.close();
      console.error(error);
      process.exitCode = 1;
    });
}

module.exports = { runSeed };
