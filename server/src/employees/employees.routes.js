'use strict';

const express = require('express');
const {
  listEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  parseEmployeeFilters,
} = require('./employees.service');
const { iterateMatching } = require('./employees.repository');
const { writeCsvStream } = require('../shared/csv');
const { toMajorUnits } = require('../shared/money');

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

function toEmployeeExportRow(row) {
  return [
    row.firstName,
    row.lastName,
    row.email,
    row.departmentName,
    row.countryName,
    row.jobLevelLabel,
    row.currencyCode,
    toMajorUnits(row.salaryMinorUnits).toFixed(2),
    row.hireDate,
  ];
}

function* toEmployeeExportRows(matchingRows) {
  for (const row of matchingRows) {
    yield toEmployeeExportRow(row);
  }
}

function createEmployeesRouter(db) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.json(listEmployees(db, req.query));
  });

  router.get('/export', (req, res) => {
    const matchingRows = iterateMatching(db, parseEmployeeFilters(req.query));
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
