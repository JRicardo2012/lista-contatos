// jest.config.js - Configuração do Jest simplificada

module.exports = {
  testEnvironment: 'node',
  
  // Diretórios de teste
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/__tests__/**/*.spec.js'
  ],
  
  // Setup de testes
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup.js'
  ],
  
  // Mocks para Node.js
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  
  // Timeout dos testes
  testTimeout: 10000,
  
  // Verbose para debug
  verbose: true
};