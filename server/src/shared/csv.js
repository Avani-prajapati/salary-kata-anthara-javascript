'use strict';

const CSV_DELIMITER = ',';
const CSV_LINE_ENDING = '\r\n';
const FIELD_NEEDING_QUOTING = /[",\n]/;

function escapeCsvField(field) {
  const value = String(field);
  return FIELD_NEEDING_QUOTING.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function toCsvRow(fields) {
  return `${fields.map(escapeCsvField).join(CSV_DELIMITER)}${CSV_LINE_ENDING}`;
}

function writeCsvStream(res, headerFields, rows, filename = 'export.csv') {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.write(toCsvRow(headerFields));
  for (const row of rows) {
    res.write(toCsvRow(row));
  }
  res.end();
}

module.exports = { toCsvRow, writeCsvStream };
