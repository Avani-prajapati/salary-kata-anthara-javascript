'use strict';

const { describe, it, expect } = await import('vitest');
const { toCsvRow } = require('./csv');

describe('encoding a CSV row', () => {
  it('quotes and escapes a field containing a comma, a quote, and a newline', () => {
    const row = toCsvRow(['Jane, "HR" Doe\nSecond line', 'Engineering', 95000]);

    expect(row).toBe('"Jane, ""HR"" Doe\nSecond line",Engineering,95000\r\n');
  });
});
