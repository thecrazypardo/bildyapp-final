/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  transform: {},
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};
