export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  collectCoverageFrom: [
    'js/**/*.js',
    '!js/**/*.test.js',
    '!js/**/*.spec.js',
    '!workers/**/*.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleFileExtensions: ['js', 'json'],
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/js/**/*.test.js'
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  transform: {},
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ]
};