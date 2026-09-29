'use strict';

const express = require('express');
const { createLookupsRouter } = require('./lookups/lookups.routes');
const { createEmployeesRouter } = require('./employees/employees.routes');
const { errorMiddleware } = require('./shared/errorMiddleware');

const JSON_BODY_LIMIT = '100kb';

function createApp(db) {
  const app = express();

  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use('/api', createLookupsRouter(db));
  app.use('/api/employees', createEmployeesRouter(db));
  app.use(errorMiddleware);

  return app;
}

module.exports = { createApp };
