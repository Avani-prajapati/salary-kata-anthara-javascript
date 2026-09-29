'use strict';

const express = require('express');
const { listDepartments, listCountries, listJobLevels } = require('./lookups.repository');

function createLookupsRouter(db) {
  const router = express.Router();

  router.get('/departments', (req, res) => {
    res.json(listDepartments(db));
  });

  router.get('/countries', (req, res) => {
    res.json(listCountries(db));
  });

  router.get('/job-levels', (req, res) => {
    res.json(listJobLevels(db));
  });

  return router;
}

module.exports = { createLookupsRouter };
