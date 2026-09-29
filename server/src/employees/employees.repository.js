'use strict';

const SORT_COLUMN_BY_KEY = {
  lastName: 'e.last_name',
  firstName: 'e.first_name',
  department: 'd.name',
  country: 'c.name',
  jobLevel: 'jl.rank',
  salary: 'e.salary_minor_units',
  hireDate: 'e.hire_date',
};

const SELECT_EMPLOYEE_COLUMNS = `
  SELECT
    e.id AS id,
    e.first_name AS firstName,
    e.last_name AS lastName,
    e.email AS email,
    e.department_id AS departmentId,
    d.name AS departmentName,
    e.country_id AS countryId,
    c.name AS countryName,
    c.iso_code AS countryIsoCode,
    e.job_level_id AS jobLevelId,
    jl.code AS jobLevelCode,
    jl.label AS jobLevelLabel,
    e.currency_code AS currencyCode,
    e.salary_minor_units AS salaryMinorUnits,
    e.hire_date AS hireDate
  FROM employees e
  JOIN departments d ON d.id = e.department_id
  JOIN countries c ON c.id = e.country_id
  JOIN job_levels jl ON jl.id = e.job_level_id
`;

function buildFilterClause({ search, departmentId, countryId, jobLevelId }) {
  const conditions = [];
  const params = [];

  if (search) {
    conditions.push('(e.first_name LIKE ? OR e.last_name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  if (departmentId !== undefined) {
    conditions.push('e.department_id = ?');
    params.push(departmentId);
  }

  if (countryId !== undefined) {
    conditions.push('e.country_id = ?');
    params.push(countryId);
  }

  if (jobLevelId !== undefined) {
    conditions.push('e.job_level_id = ?');
    params.push(jobLevelId);
  }

  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

function findMany(db, { page, pageSize, search, departmentId, countryId, jobLevelId, sortBy, sortDir }) {
  const { clause, params } = buildFilterClause({ search, departmentId, countryId, jobLevelId });
  const sortColumn = SORT_COLUMN_BY_KEY[sortBy];
  const sortDirection = sortDir === 'desc' ? 'DESC' : 'ASC';
  const offset = (page - 1) * pageSize;

  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM employees e ${clause}`).get(...params);

  const items = db
    .prepare(`${SELECT_EMPLOYEE_COLUMNS} ${clause} ORDER BY ${sortColumn} ${sortDirection} LIMIT ? OFFSET ?`)
    .all(...params, pageSize, offset);

  return { items, total };
}

function findById(db, id) {
  return db.prepare(`${SELECT_EMPLOYEE_COLUMNS} WHERE e.id = ?`).get(id);
}

const UPDATE_COLUMN_BY_FIELD = {
  firstName: 'first_name',
  lastName: 'last_name',
  email: 'email',
  departmentId: 'department_id',
  countryId: 'country_id',
  jobLevelId: 'job_level_id',
  salaryMinorUnits: 'salary_minor_units',
  hireDate: 'hire_date',
};

function update(db, id, patch) {
  const fields = Object.keys(patch).filter((field) => field in UPDATE_COLUMN_BY_FIELD);
  const setClauses = [
    ...fields.map((field) => `${UPDATE_COLUMN_BY_FIELD[field]} = ?`),
    "updated_at = datetime('now')",
  ];
  const values = fields.map((field) => patch[field]);

  db.prepare(`UPDATE employees SET ${setClauses.join(', ')} WHERE id = ?`).run(...values, id);
}

function create(db, row) {
  const result = db
    .prepare(
      `INSERT INTO employees (
        first_name, last_name, email, department_id, country_id, job_level_id,
        currency_code, salary_minor_units, hire_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      row.firstName,
      row.lastName,
      row.email,
      row.departmentId,
      row.countryId,
      row.jobLevelId,
      row.currencyCode,
      row.salaryMinorUnits,
      row.hireDate
    );

  return result.lastInsertRowid;
}

function remove(db, id) {
  db.prepare('DELETE FROM employees WHERE id = ?').run(id);
}

const GROUP_BY_CONFIG = {
  department: { column: 'department_id', table: 'departments', labelColumn: 'name' },
  country: { column: 'country_id', table: 'countries', labelColumn: 'name' },
  jobLevel: { column: 'job_level_id', table: 'job_levels', labelColumn: 'label' },
};

function getCompensationStats(db, groupBy) {
  const { column, table, labelColumn } = GROUP_BY_CONFIG[groupBy];

  return db
    .prepare(
      `
      WITH ordered AS (
        SELECT
          ${column} AS group_id,
          currency_code,
          salary_minor_units,
          ROW_NUMBER() OVER (PARTITION BY ${column}, currency_code ORDER BY salary_minor_units) AS rn,
          COUNT(*) OVER (PARTITION BY ${column}, currency_code) AS cnt
        FROM employees
      ),
      medians AS (
        SELECT group_id, currency_code, AVG(salary_minor_units) AS median_minor
        FROM ordered
        WHERE rn IN ((cnt + 1) / 2, (cnt + 2) / 2)
        GROUP BY group_id, currency_code
      ),
      aggregates AS (
        SELECT
          group_id,
          currency_code,
          COUNT(*) AS count,
          AVG(salary_minor_units) AS avg_minor,
          MIN(salary_minor_units) AS min_minor,
          MAX(salary_minor_units) AS max_minor
        FROM ordered
        GROUP BY group_id, currency_code
      )
      SELECT
        a.group_id AS groupId,
        g.${labelColumn} AS groupLabel,
        a.currency_code AS currencyCode,
        a.count AS count,
        a.avg_minor AS avgMinor,
        m.median_minor AS medianMinor,
        a.min_minor AS minMinor,
        a.max_minor AS maxMinor
      FROM aggregates a
      JOIN medians m ON m.group_id = a.group_id AND m.currency_code = a.currency_code
      JOIN ${table} g ON g.id = a.group_id
      ORDER BY g.${labelColumn}, a.currency_code
      `
    )
    .all();
}

module.exports = { findMany, findById, create, update, remove, getCompensationStats };
