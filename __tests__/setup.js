// __tests__/setup.js - Configuração global dos testes simplificada

// Mock global do console para testes limpos
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock do __DEV__
global.__DEV__ = true;

// Aumenta timeout para testes async
jest.setTimeout(10000);
