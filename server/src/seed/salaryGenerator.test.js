'use strict';

const { describe, it, expect } = await import('vitest');
const { generateSalaryMinorUnits } = require('./salaryGenerator');
const { createSeededRandom } = require('./seededRandom');

const POSITIVE_INTEGER_CASES = [
  { jobLevelRank: 1, countryIsoCode: 'GB', departmentName: 'Customer Support' },
  { jobLevelRank: 6, countryIsoCode: 'IN', departmentName: 'Legal' },
  { jobLevelRank: 3, countryIsoCode: 'US', departmentName: 'Marketing' },
  { jobLevelRank: 4, countryIsoCode: 'AU', departmentName: 'Engineering' },
];

describe('salary generation reflects job-level seniority', () => {
  it('places a level-1 salary below a level-6 salary in the same country and department at the RNG midpoint', () => {
    const midpointRandom = () => 0.5;
    const sharedParams = { countryIsoCode: 'US', departmentName: 'Engineering', random: midpointRandom };

    const level1Salary = generateSalaryMinorUnits({ jobLevelRank: 1, ...sharedParams });
    const level6Salary = generateSalaryMinorUnits({ jobLevelRank: 6, ...sharedParams });

    expect(level1Salary).toBeLessThan(level6Salary);
  });
});

describe('salary generation always yields a positive integer minor-unit amount', () => {
  const random = createSeededRandom(7);

  it.each(POSITIVE_INTEGER_CASES)(
    'generates a positive integer for job level rank $jobLevelRank in $countryIsoCode / $departmentName',
    ({ jobLevelRank, countryIsoCode, departmentName }) => {
      const salary = generateSalaryMinorUnits({ jobLevelRank, countryIsoCode, departmentName, random });

      expect(Number.isInteger(salary)).toBe(true);
      expect(salary).toBeGreaterThan(0);
    }
  );
});
