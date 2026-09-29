'use strict';

const { describe, it, expect } = await import('vitest');
const { toMinorUnits, toMajorUnits } = require('./money');

describe('converting major-unit salary amounts to minor units', () => {
  it('converts a whole major-unit amount to its integer minor-unit equivalent', () => {
    expect(toMinorUnits(95000)).toBe(9500000);
  });

  it('converts a two-decimal major-unit amount to its integer minor-unit equivalent', () => {
    expect(toMinorUnits(95000.5)).toBe(9500050);
  });

  it('rounds a sub-cent amount half up to the nearest minor unit', () => {
    expect(toMinorUnits(95000.005)).toBe(9500001);
  });
});

describe('converting minor-unit salary amounts to major units', () => {
  it('converts an integer minor-unit amount back to its major-unit decimal', () => {
    expect(toMajorUnits(9500000)).toBe(95000);
  });

  it('preserves cents when converting a minor-unit amount that is not a round major unit', () => {
    expect(toMajorUnits(9500050)).toBe(95000.5);
  });
});
