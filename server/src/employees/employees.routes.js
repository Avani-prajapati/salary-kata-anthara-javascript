'use strict';

const express = require('express');
const { listEmployees } = require('./employees.service');

function createEmployeesRouter(db) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.json(listEmployees(db, req.query));
  });

  return router;
}

module.exports = { createEmployeesRouter };
