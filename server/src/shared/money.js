'use strict';

const MINOR_UNITS_PER_MAJOR_UNIT = 100;

function toMinorUnits(majorUnitsDecimal) {
  return Math.round(majorUnitsDecimal * MINOR_UNITS_PER_MAJOR_UNIT);
}

function toMajorUnits(minorUnitsInteger) {
  return minorUnitsInteger / MINOR_UNITS_PER_MAJOR_UNIT;
}

module.exports = { toMinorUnits, toMajorUnits };
