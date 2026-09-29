'use strict';

const express = require('express');
const { getCompensationStats } = require('./reports.service');

function createReportsRouter(db) {
  const router = express.Router();

  router.get('/compensation-stats', (req, res) => {
    res.json(getCompensationStats(db, req.query.groupBy));
  });

  return router;
}

module.exports = { createReportsRouter };
