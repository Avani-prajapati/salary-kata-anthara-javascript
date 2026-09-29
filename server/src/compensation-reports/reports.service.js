'use strict';

const { getCompensationStats: getCompensationStatsRows } = require('../employees/employees.repository');
const { ValidationError } = require('../shared/errors');

const GROUP_BY_VALUES = ['department', 'country', 'jobLevel'];
const MINOR_UNITS_PER_MAJOR_UNIT = 100;

function validateGroupBy(groupBy) {
  if (!GROUP_BY_VALUES.includes(groupBy)) {
    throw new ValidationError([
      { field: 'groupBy', message: `groupBy must be one of ${GROUP_BY_VALUES.join(', ')}` },
    ]);
  }
}

function toMajorUnits(minorValue) {
  return minorValue / MINOR_UNITS_PER_MAJOR_UNIT;
}

function toCompensationStatDto(row) {
  return {
    groupId: row.groupId,
    groupLabel: row.groupLabel,
    currencyCode: row.currencyCode,
    count: row.count,
    avgMajorUnits: toMajorUnits(row.avgMinor),
    medianMajorUnits: toMajorUnits(row.medianMinor),
    minMajorUnits: toMajorUnits(row.minMinor),
    maxMajorUnits: toMajorUnits(row.maxMinor),
  };
}

function getCompensationStats(db, groupBy) {
  validateGroupBy(groupBy);

  return getCompensationStatsRows(db, groupBy).map(toCompensationStatDto);
}

module.exports = { getCompensationStats };
