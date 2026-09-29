'use strict';

const Database = require('better-sqlite3');

function createConnection(path) {
  return new Database(path);
}

module.exports = { createConnection };
