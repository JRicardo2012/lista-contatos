// __tests__/simple.test.js - Teste simples para verificar se o Jest funciona

describe('Teste Básico', () => {
  it('deve passar no teste simples', () => {
    expect(1 + 1).toBe(2);
  });

  it('deve testar strings', () => {
    expect('hello').toBe('hello');
  });

  it('deve testar arrays', () => {
    const array = [1, 2, 3];
    expect(array).toHaveLength(3);
    expect(array).toContain(2);
  });

  it('deve testar objetos', () => {
    const obj = { name: 'teste', value: 123 };
    expect(obj).toHaveProperty('name');
    expect(obj.name).toBe('teste');
  });
});
