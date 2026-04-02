/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  projects: [
    {
      displayName: 'unit',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['**/unit_tests/**/*.spec.ts'],
      moduleFileExtensions: ['ts', 'js', 'json'],
      modulePathIgnorePatterns: ['<rootDir>/dist/'],
      moduleNameMapper: {
        '../models/prisma': '<rootDir>/src/__mocks__/prisma.ts',
        '../../models/prisma': '<rootDir>/src/__mocks__/prisma.ts',
      },
    },
    {
      displayName: 'api',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['**/API_tests/**/*.spec.ts'],
      moduleFileExtensions: ['ts', 'js', 'json'],
      modulePathIgnorePatterns: ['<rootDir>/dist/'],
    },
  ],
};
