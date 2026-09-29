'use strict';

const express = require('express');
const {
  listEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  toOptionalId,
} = require('./employees.service');
const { iterateMatching } = require('./employees.repository');
const { writeCsvStream } = require('../shared/csv');

const EMPLOYEE_EXPORT_HEADER = [
  'First name',
  'Last name',
  'Email',
  'Department',
  'Country',
  'Job level',
  'Currency',
  'Salary',
  'Hire date',
];
const MINOR_UNITS_PER_MAJOR_UNIT = 100;

function toEmployeeExportRow(row) {
  return [
    row.firstName,
    row.lastName,
    row.email,
    row.departmentName,
    row.countryName,
    row.jobLevelLabel,
    row.currencyCode,
    (row.salaryMinorUnits / MINOR_UNITS_PER_MAJOR_UNIT).toFixed(2),
    row.hireDate,
  ];
}

function* toEmployeeExportRows(matchingRows) {
  for (const row of matchingRows) {
    yield toEmployeeExportRow(row);
  }
}

function toEmployeeFilters(queryParams) {
  return {
    search: queryParams.search || undefined,
    departmentId: toOptionalId(queryParams.department),
    countryId: toOptionalId(queryParams.country),
    jobLevelId: toOptionalId(queryParams.jobLevel),
  };
}

function createEmployeesRouter(db) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.json(listEmployees(db, req.query));
  });

  router.get('/export', (req, res) => {
    const matchingRows = iterateMatching(db, toEmployeeFilters(req.query));
    writeCsvStream(res, EMPLOYEE_EXPORT_HEADER, toEmployeeExportRows(matchingRows), 'employees.csv');
  });

  router.get('/:id', (req, res) => {
    res.json(getEmployee(db, Number.parseInt(req.params.id, 10)));
  });

  router.post('/', (req, res) => {
    res.status(201).json(createEmployee(db, req.body));
  });

  router.patch('/:id', (req, res) => {
    res.json(updateEmployee(db, Number.parseInt(req.params.id, 10), req.body));
  });

  router.delete('/:id', (req, res) => {
    deleteEmployee(db, Number.parseInt(req.params.id, 10));
    res.status(204).end();
  });

  return router;
}

module.exports = { createEmployeesRouter };
