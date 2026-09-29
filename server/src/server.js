'use strict';

const path = require('node:path');
const fs = require('node:fs');
const { createApp } = require('./app');
const { createConnection } = require('./db/connection');
const { createSchema } = require('./db/schema');

const DEFAULT_PORT = 3001;

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../data/employees.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = createConnection(dbPath);
createSchema(db);

const app = createApp(db);
const port = process.env.PORT || DEFAULT_PORT;

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
