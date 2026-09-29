'use strict';

const express = require('express');
const { listEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee } = require('./employees.service');

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
