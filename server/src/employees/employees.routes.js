'use strict';

const express = require('express');
const { listEmployees, getEmployee } = require('./employees.service');

function createEmployeesRouter(db) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.json(listEmployees(db, req.query));
  });

  router.get('/:id', (req, res) => {
    res.json(getEmployee(db, Number.parseInt(req.params.id, 10)));
  });

  return router;
}

module.exports = { createEmployeesRouter };
