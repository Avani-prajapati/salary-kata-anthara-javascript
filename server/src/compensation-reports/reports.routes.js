'use strict';

const express = require('express');
const { getCompensationStats, getHeadcount, getSalaryDistribution } = require('./reports.service');

function createReportsRouter(db) {
  const router = express.Router();

  router.get('/compensation-stats', (req, res) => {
    res.json(getCompensationStats(db, req.query.groupBy));
  });

  router.get('/headcount', (req, res) => {
    res.json(getHeadcount(db, req.query.groupBy));
  });

  router.get('/salary-distribution', (req, res) => {
    res.json(getSalaryDistribution(db, req.query.currency));
  });

  return router;
}

module.exports = { createReportsRouter };
