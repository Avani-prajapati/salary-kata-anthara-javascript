'use strict';

const { toMinorUnits } = require('../shared/money');

const BASE_RANGE_USD_BY_JOB_LEVEL_RANK = {
  1: [40000, 65000],
  2: [60000, 90000],
  3: [85000, 130000],
  4: [120000, 170000],
  5: [160000, 230000],
  6: [220000, 350000],
};

const COUNTRY_SCALE_FACTOR_BY_ISO_CODE = {
  US: 1.0,
  CA: 1.35,
  GB: 0.8,
  DE: 0.9,
  AU: 1.5,
  IN: 83,
};

const DEPARTMENT_MODIFIER_BY_NAME = {
  Engineering: 1.1,
  Legal: 1.1,
  Finance: 1.05,
  Marketing: 0.95,
  Sales: 0.95,
  Operations: 0.9,
  HR: 0.9,
  'Customer Support': 0.85,
};

const VARIANCE_RATIO = 0.1;

function generateSalaryMinorUnits({ jobLevelRank, countryIsoCode, departmentName, random }) {
  const [minBaseSalary, maxBaseSalary] = BASE_RANGE_USD_BY_JOB_LEVEL_RANK[jobLevelRank];
  const baseSalary = minBaseSalary + random() * (maxBaseSalary - minBaseSalary);

  const scaledSalary =
    baseSalary *
    COUNTRY_SCALE_FACTOR_BY_ISO_CODE[countryIsoCode] *
    DEPARTMENT_MODIFIER_BY_NAME[departmentName];

  const varianceFactor = 1 + (random() * 2 - 1) * VARIANCE_RATIO;
  const majorUnitSalary = Math.round(scaledSalary * varianceFactor);

  return toMinorUnits(majorUnitSalary);
}

module.exports = { generateSalaryMinorUnits };
