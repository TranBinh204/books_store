/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  globalSetup: '<rootDir>/tests/global-setup.js',
  setupFiles: ['<rootDir>/tests/setup.ts'],
  clearMocks: true,
  // Các suite tích hợp dùng chung 1 DB test (truncate/seed) → không chạy song song
  maxWorkers: 1,
};
