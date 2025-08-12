// services/AuthContext.js - VERSÃO COM HASH DE SENHAS
import React, { createContext, useState, useContext, useEffect, useReducer } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSQLiteContext } from 'expo-sqlite';
import { hashPassword, verifyPassword } from '../utils/crypto';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

const authReducer = (state, action) => {
  switch (action.type) {
  case 'SET_USER':
    return { ...state, user: action.payload, isAuthenticated: !!action.payload };
  case 'SET_LOADING':
    return { ...state, loading: action.payload };
  case 'RESET':
    return { user: null, loading: false, isAuthenticated: false };
  default:
    return state;
  }
};

export const AuthProvider = ({ children }) => {
  const db = useSQLiteContext();

  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    loading: true,
    isAuthenticated: false
  });

  useEffect(() => {
    if (db) {
      checkAuthState();
    }
  }, [db]);

  const checkAuthState = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');

      if (userData) {
        const parsedUser = JSON.parse(userData);

        const dbUser = await db.getFirstAsync(
          'SELECT * FROM users WHERE id = ? AND is_active = 1',
          [parsedUser.id]
        );

        if (dbUser) {
          dispatch({ type: 'SET_USER', payload: dbUser });
        } else {
          await AsyncStorage.removeItem('user');
          dispatch({ type: 'SET_USER', payload: null });
        }
      } else {
        dispatch({ type: 'SET_USER', payload: null });
      }
    } catch (error) {
      console.error('❌ Erro ao verificar autenticação:', error);
      dispatch({ type: 'SET_USER', payload: null });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const login = async (email, password) => {
    try {
      // Limpa e valida inputs
      const cleanEmail = email.trim().toLowerCase();
      const cleanPassword = password.trim();

      // Validações básicas
      if (!cleanEmail || !cleanPassword) {
        return {
          success: false,
          error: 'Por favor, preencha email e senha'
        };
      }

      if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
        return {
          success: false,
          error: 'Por favor, digite um email válido'
        };
      }

      // Busca o usuário
      const user = await db.getFirstAsync('SELECT * FROM users WHERE email = ?', [cleanEmail]);

      if (!user) {
        return {
          success: false,
          error: 'Email não encontrado. Verifique o email digitado ou crie uma nova conta.'
        };
      }

      // Verifica a senha com hash
      const isPasswordValid = verifyPassword(cleanPassword, user.password);

      if (!isPasswordValid) {
        // Tenta com senha antiga (migração)
        if (user.password === cleanPassword) {
          // Senha antiga, vamos atualizar
          console.log('🔄 Atualizando senha antiga para hash...');
          const hashedPassword = hashPassword(cleanPassword);

          await db.runAsync('UPDATE users SET password = ? WHERE id = ?', [
            hashedPassword,
            user.id
          ]);

          user.password = hashedPassword;
        } else {
          return {
            success: false,
            error: 'Senha incorreta. Tente novamente.'
          };
        }
      }

      // Verifica se o usuário está ativo
      if (user.is_active === 0) {
        return {
          success: false,
          error: 'Esta conta foi desativada. Entre em contato com o suporte.'
        };
      }

      // Login bem sucedido
      await AsyncStorage.setItem('user', JSON.stringify(user));
      dispatch({ type: 'SET_USER', payload: user });

      // Atualiza último login
      try {
        await db.runAsync('UPDATE users SET last_login = datetime("now") WHERE id = ?', [user.id]);
      } catch (updateError) {
        console.warn('⚠️ Erro ao atualizar último login:', updateError);
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Erro inesperado no login:', error);
      return {
        success: false,
        error: 'Ocorreu um erro inesperado. Tente novamente.'
      };
    }
  };

  const register = async (name, email, password) => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = name.trim();
      const cleanPassword = password.trim();

      // Validações
      if (!cleanName || cleanName.length < 2) {
        return {
          success: false,
          error: 'Por favor, digite um nome válido (mínimo 2 caracteres)'
        };
      }

      if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
        return {
          success: false,
          error: 'Por favor, digite um email válido'
        };
      }

      if (cleanPassword.length < 6) {
        return {
          success: false,
          error: 'A senha deve ter pelo menos 6 caracteres'
        };
      }

      // Verifica se email já existe
      const existing = await db.getFirstAsync('SELECT id FROM users WHERE email = ?', [cleanEmail]);

      if (existing) {
        return {
          success: false,
          error: 'Este email já está cadastrado. Faça login ou use outro email.'
        };
      }

      // Hash da senha
      const hashedPassword = hashPassword(cleanPassword);

      // Cria novo usuário
      const result = await db.runAsync(
        `INSERT INTO users (name, email, password, created_at, last_login, is_active) 
         VALUES (?, ?, ?, datetime('now'), datetime('now'), 1)`,
        [cleanName, cleanEmail, hashedPassword]
      );

      // Busca o usuário criado
      const newUser = await db.getFirstAsync('SELECT * FROM users WHERE id = ?', [
        result.lastInsertRowId
      ]);

      if (!newUser) {
        return {
          success: false,
          error: 'Erro ao criar conta. Tente novamente.'
        };
      }

      // Copia categorias e métodos de pagamento padrão para o novo usuário
      await copyDefaultDataForUser(newUser.id);

      // Salva e autentica
      await AsyncStorage.setItem('user', JSON.stringify(newUser));
      dispatch({ type: 'SET_USER', payload: newUser });

      return { success: true, user: newUser };
    } catch (error) {
      console.error('❌ Erro no registro:', error);

      if (error.message.includes('UNIQUE constraint')) {
        return {
          success: false,
          error: 'Este email já está cadastrado.'
        };
      }

      return {
        success: false,
        error: 'Erro ao criar conta. Tente novamente.'
      };
    }
  };

  const copyDefaultDataForUser = async userId => {
    try {
      console.log('📋 Copiando dados padrão para usuário...');

      // Copia categorias padrão
      const defaultCategories = await db.getAllAsync(
        'SELECT name, icon FROM categories WHERE user_id = (SELECT id FROM users WHERE email = ?)',
        ['system@default.com']
      );

      for (const cat of defaultCategories) {
        try {
          await db.runAsync('INSERT INTO categories (name, icon, user_id) VALUES (?, ?, ?)', [
            cat.name,
            cat.icon,
            userId
          ]);
        } catch (e) {
          console.warn('⚠️ Erro ao copiar categoria:', e.message);
        }
      }

      // Copia métodos de pagamento padrão
      const defaultMethods = await db.getAllAsync(
        'SELECT name, icon FROM payment_methods WHERE user_id = (SELECT id FROM users WHERE email = ?)',
        ['system@default.com']
      );

      for (const method of defaultMethods) {
        try {
          await db.runAsync('INSERT INTO payment_methods (name, icon, user_id) VALUES (?, ?, ?)', [
            method.name,
            method.icon,
            userId
          ]);
        } catch (e) {
          console.warn('⚠️ Erro ao copiar método de pagamento:', e.message);
        }
      }

      console.log('✅ Dados padrão copiados para o usuário');
    } catch (error) {
      console.error('❌ Erro ao copiar dados padrão:', error);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('user');
      dispatch({ type: 'RESET' });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Erro ao sair. Tente novamente.'
      };
    }
  };

  const updateProfile = async updates => {
    try {
      if (!state.user) {
        return {
          success: false,
          error: 'Você precisa estar logado para atualizar o perfil.'
        };
      }

      const cleanName = updates.name.trim();

      if (!cleanName || cleanName.length < 2) {
        return {
          success: false,
          error: 'Nome deve ter pelo menos 2 caracteres.'
        };
      }

      await db.runAsync('UPDATE users SET name = ? WHERE id = ?', [cleanName, state.user.id]);

      const updatedUser = { ...state.user, name: cleanName };

      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      dispatch({ type: 'SET_USER', payload: updatedUser });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Erro ao atualizar perfil. Tente novamente.'
      };
    }
  };

  const value = {
    user: state.user,
    loading: state.loading,
    isAuthenticated: state.isAuthenticated,
    login,
    register,
    logout,
    updateProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
