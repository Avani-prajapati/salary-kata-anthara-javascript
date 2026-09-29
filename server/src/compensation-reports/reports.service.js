'use strict';

const {
  getCompensationStats: getCompensationStatsRows,
  getHeadcount: getHeadcountRows,
  getSalaryDistribution: getSalaryDistributionRows,
  getDefaultDistributionCurrency,
} = require('../employees/employees.repository');
const { ValidationError } = require('../shared/errors');
const { toMajorUnits } = require('../shared/money');

const GROUP_BY_VALUES = ['department', 'country', 'jobLevel'];

function validateGroupBy(groupBy) {
  if (!GROUP_BY_VALUES.includes(groupBy)) {
    throw new ValidationError([
      { field: 'groupBy', message: `groupBy must be one of ${GROUP_BY_VALUES.join(', ')}` },
    ]);
  }
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

function getHeadcount(db, groupBy) {
  validateGroupBy(groupBy);

  return getHeadcountRows(db, groupBy);
}

function toSalaryBucketDto(bucket) {
  return {
    bucketIndex: bucket.bucketIndex,
    minMajorUnits: bucket.bucketMinMajor,
    maxMajorUnits: bucket.bucketMaxMajor,
    count: bucket.count,
  };
}

function getSalaryDistribution(db, currencyCode) {
  const resolvedCurrencyCode = currencyCode || getDefaultDistributionCurrency(db);
  const buckets = getSalaryDistributionRows(db, resolvedCurrencyCode).map(toSalaryBucketDto);

  return { currencyCode: resolvedCurrencyCode, buckets };
}

module.exports = { getCompensationStats, getHeadcount, getSalaryDistribution };
