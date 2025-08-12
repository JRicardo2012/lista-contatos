// components/EstablishmentCategoryForm.js - FORMULÁRIO DE CATEGORIA DE ESTABELECIMENTO
import React from 'react';
import { Alert } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuth } from '../services/AuthContext';
import ModalForm from './ModalForm';

// Ícones disponíveis para categorias de estabelecimentos
const AVAILABLE_ESTABLISHMENT_ICONS = [
  { value: '🍽️', label: 'Restaurante' },
  { value: '🛒', label: 'Supermercado' },
  { value: '💊', label: 'Farmácia' },
  { value: '⛽', label: 'Posto de Combustível' },
  { value: '🏪', label: 'Loja Geral' },
  { value: '☕', label: 'Café/Padaria' },
  { value: '🍔', label: 'Fast Food' },
  { value: '🏥', label: 'Hospital/Clínica' },
  { value: '🏦', label: 'Banco/Financeira' },
  { value: '🏫', label: 'Escola/Curso' },
  { value: '🚗', label: 'Concessionária' },
  { value: '👕', label: 'Roupas/Moda' },
  { value: '👟', label: 'Calçados' },
  { value: '🔧', label: 'Oficina/Mecânica' },
  { value: '💄', label: 'Beleza/Estética' },
  { value: '🏠', label: 'Casa/Construção' },
  { value: '📱', label: 'Eletrônicos' },
  { value: '📚', label: 'Livraria/Papelaria' },
  { value: '🎬', label: 'Cinema/Lazer' },
  { value: '🏋️', label: 'Academia/Esporte' },
  { value: '🐾', label: 'Pet Shop' },
  { value: '🌳', label: 'Jardim/Plantas' },
  { value: '🔌', label: 'Elétrica' },
  { value: '🚿', label: 'Hidráulica' },
  { value: '🍕', label: 'Pizzaria' },
  { value: '🍻', label: 'Bar/Pub' },
  { value: '💇', label: 'Salão/Barbearia' },
  { value: '🚕', label: 'Transporte/Taxi' },
  { value: '⚖️', label: 'Jurídico/Advocacia' },
  { value: '🏨', label: 'Hotel/Hospedagem' }
];

// Campos do formulário
const establishmentCategoryFields = [
  {
    name: 'name',
    type: 'text',
    label: 'Nome da Categoria',
    placeholder: 'Ex: Restaurante, Supermercado, Farmácia',
    icon: 'tag',
    maxLength: 50
  },
  {
    name: 'icon',
    type: 'select',
    label: 'Ícone',
    options: AVAILABLE_ESTABLISHMENT_ICONS
  }
];

// Validações do formulário
const validationRules = {
  name: {
    required: true,
    minLength: 2,
    minLengthMessage: 'Nome deve ter pelo menos 2 caracteres',
    custom: (value) => {
      if (value && value.length > 50) {
        return 'Nome não pode ter mais de 50 caracteres';
      }
      return '';
    }
  },
  icon: {
    required: true,
    requiredMessage: 'Escolha um ícone para a categoria'
  }
};

export default function EstablishmentCategoryForm({ visible, category, onClose, onSaved }) {
  const db = useSQLiteContext();
  const { user } = useAuth();

  // Função de salvamento
  const handleSave = async (formData) => {
    if (!user) {
      throw new Error('Você precisa estar logado para gerenciar categorias de estabelecimentos.');
    }

    const data = {
      name: formData.name.trim(),
      icon: formData.icon,
      user_id: user.id
    };

    try {
      // Verificar se tabela establishment_categories existe
      try {
        await db.getAllAsync('SELECT 1 FROM establishment_categories LIMIT 1');
      } catch (tableError) {
        throw new Error('A funcionalidade de categorias requer atualização do banco. Feche e abra o aplicativo novamente.');
      }

      if (category?.id) {
        // Verificar se já existe outra categoria com o mesmo nome
        const existingCategory = await db.getFirstAsync(
          'SELECT id FROM establishment_categories WHERE name = ? AND user_id = ? AND id != ?',
          [data.name, user.id, category.id]
        );

        if (existingCategory) {
          throw new Error('Já existe uma categoria de estabelecimento com este nome.');
        }

        // Atualização
        await db.runAsync(
          `UPDATE establishment_categories 
           SET name = ?, icon = ?, updated_at = datetime('now')
           WHERE id = ? AND user_id = ?`,
          [data.name, data.icon, category.id, user.id]
        );
        
        console.log('✅ Categoria de estabelecimento atualizada:', category.id);
      } else {
        // Verificar se já existe categoria com o mesmo nome
        const existingCategory = await db.getFirstAsync(
          'SELECT id FROM establishment_categories WHERE name = ? AND user_id = ?',
          [data.name, user.id]
        );

        if (existingCategory) {
          throw new Error('Já existe uma categoria de estabelecimento com este nome.');
        }

        // Inserção
        const result = await db.runAsync(
          `INSERT INTO establishment_categories (name, icon, user_id) VALUES (?, ?, ?)`,
          [data.name, data.icon, data.user_id]
        );
        
        console.log('✅ Nova categoria de estabelecimento criada com ID:', result.lastInsertRowId);
      }

      // Notifica listeners globais
      if (global.expenseListeners) {
        global.expenseListeners.forEach(listener => {
          if (typeof listener === 'function') {
            listener();
          }
        });
      }

      if (onSaved) onSaved();
    } catch (error) {
      console.error('❌ Erro ao salvar categoria de estabelecimento:', error);
      throw new Error(error.message || 'Não foi possível salvar a categoria. Tente novamente.');
    }
  };

  // Valores iniciais do formulário
  const initialValues = {
    name: category?.name || '',
    icon: category?.icon || '🏪'
  };

  return (
    <ModalForm
      visible={visible}
      onClose={onClose}
      onSubmit={handleSave}
      title={category?.id ? 'Editar Categoria' : 'Nova Categoria'}
      subtitle={category?.id ? 'Atualize as informações da categoria de estabelecimento' : 'Crie uma nova categoria para estabelecimentos'}
      fields={establishmentCategoryFields}
      validationRules={validationRules}
      initialValues={initialValues}
      submitText={category?.id ? 'Atualizar' : 'Salvar'}
      cancelText='Cancelar'
    />
  );
}