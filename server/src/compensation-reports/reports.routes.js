'use strict';

const express = require('express');
const { getCompensationStats, getHeadcount, getSalaryDistribution } = require('./reports.service');
const { writeCsvStream } = require('../shared/csv');

const COMPENSATION_STATS_EXPORT_HEADER = ['Group', 'Currency', 'Count', 'Average', 'Median', 'Min', 'Max'];
const HEADCOUNT_EXPORT_HEADER = ['Group', 'Count'];

function toCompensationStatExportRow(stat) {
  return [
    stat.groupLabel,
    stat.currencyCode,
    stat.count,
    stat.avgMajorUnits.toFixed(2),
    stat.medianMajorUnits.toFixed(2),
    stat.minMajorUnits.toFixed(2),
    stat.maxMajorUnits.toFixed(2),
  ];
}

function toHeadcountExportRow(row) {
  return [row.groupLabel, row.count];
}

function createReportsRouter(db) {
  const router = express.Router();

  router.get('/compensation-stats', (req, res) => {
    res.json(getCompensationStats(db, req.query.groupBy));
  });

  router.get('/compensation-stats/export', (req, res) => {
    const stats = getCompensationStats(db, req.query.groupBy);
    writeCsvStream(
      res,
      COMPENSATION_STATS_EXPORT_HEADER,
      stats.map(toCompensationStatExportRow),
      'compensation-stats.csv'
    );
  });

  router.get('/headcount', (req, res) => {
    res.json(getHeadcount(db, req.query.groupBy));
  });

  router.get('/headcount/export', (req, res) => {
    const headcount = getHeadcount(db, req.query.groupBy);
    writeCsvStream(res, HEADCOUNT_EXPORT_HEADER, headcount.map(toHeadcountExportRow), 'headcount.csv');
  });

  router.get('/salary-distribution', (req, res) => {
    res.json(getSalaryDistribution(db, req.query.currency));
  });

  return router;
}

module.exports = { createReportsRouter };
