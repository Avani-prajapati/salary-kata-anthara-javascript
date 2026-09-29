'use strict';

function listDepartments(db) {
  return db.prepare('SELECT id, name FROM departments ORDER BY id').all();
}

function listCountries(db) {
  return db
    .prepare(
      `SELECT id, name, iso_code AS isoCode, default_currency_code AS defaultCurrencyCode
       FROM countries
       ORDER BY id`
    )
    .all();
}

function listJobLevels(db) {
  return db.prepare('SELECT id, code, label, rank FROM job_levels ORDER BY id').all();
}

module.exports = { listDepartments, listCountries, listJobLevels };
