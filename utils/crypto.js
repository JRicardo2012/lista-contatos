// utils/crypto.js
// Sistema temporário de hash para senhas
// IMPORTANTE: Em produção, use bcrypt ou similar

export const hashPassword = (password) => {
  if (!password) return '';
  
  // Simples hash usando base64 + salt fixo (TEMPORÁRIO)
  const salt = 'FinanceApp2024';
  const combined = password + salt;
  
  // Converte para base64
  let hash = '';
  for (let i = 0; i < combined.length; i++) {
    hash += combined.charCodeAt(i).toString(16);
  }
  
  return hash;
};

export const verifyPassword = (password, hash) => {
  if (!password || !hash) return false;
  return hashPassword(password) === hash;
};

// Função auxiliar para migrar senhas antigas
export const needsPasswordMigration = (password) => {
  // Se a senha tem menos de 32 caracteres, provavelmente não está hasheada
  return password && password.length < 32;
};