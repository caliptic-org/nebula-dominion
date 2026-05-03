/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jest-environment-jsdom',
  rootDir: '.',
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        module: 'commonjs',
        moduleResolution: 'node',
        paths: { '@/*': ['./src/*'] },
        allowJs: true,
        skipLibCheck: true,
      },
      diagnostics: false,
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^next/image$': '<rootDir>/src/__mocks__/next-image.tsx',
    '^next/link$': '<rootDir>/src/__mocks__/next-link.tsx',
    '^next/navigation$': '<rootDir>/src/__mocks__/next-navigation.ts',
    '^next/router$': '<rootDir>/src/__mocks__/next-router.ts',
    '\\.css$': '<rootDir>/src/__mocks__/style.ts',
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.{ts,tsx}',
    '<rootDir>/src/**/*.test.{ts,tsx}',
    '<rootDir>/src/**/*.spec.{ts,tsx}',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleDirectories: ['node_modules', '<rootDir>/../../node_modules'],
};

module.exports = config;
