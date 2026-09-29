'use strict';

const express = require('express');
const { listEmployees, getEmployee, createEmployee } = require('./employees.service');

function createEmployeesRouter(db) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.json(listEmployees(db, req.query));
  });

  router.get('/:id', (req, res) => {
    res.json(getEmployee(db, Number.parseInt(req.params.id, 10)));
  });

  router.post('/', (req, res) => {
    res.status(201).json(createEmployee(db, req.body));
  });

  return router;
}

module.exports = { createEmployeesRouter };
