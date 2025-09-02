module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/../jest.setup.js'],
  testMatch: [
    '<rootDir>/../src/**/__tests__/**/*.{test,spec}.{js,jsx,ts,tsx}',
    '<rootDir>/../src/**/*.{test,spec}.{js,jsx,ts,tsx}'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../src/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  testTimeout: 15000,
  collectCoverageFrom: [
    '<rootDir>/../src/**/*.{ts,tsx}',
    '!<rootDir>/../src/**/*.d.ts',
  ],
  testPathIgnorePatterns: ['<rootDir>/../.next/', '<rootDir>/../node_modules/'],
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react-jsx'
      }
    }
  }
} 