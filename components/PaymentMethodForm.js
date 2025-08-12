// components/PaymentMethodForm.js - FORMULÁRIO DE FORMA DE PAGAMENTO
import React from 'react';
import { Alert } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuth } from '../services/AuthContext';
import ModalForm from './ModalForm';

// Ícones disponíveis para formas de pagamento
const AVAILABLE_PAYMENT_ICONS = [
  // Principais
  { value: '💳', label: 'Cartão' },
  { value: '💵', label: 'Dinheiro' },
  { value: '💰', label: 'Cartão Débito' },
  { value: '🏦', label: 'Transferência' },
  { value: '📱', label: 'PIX' },
  { value: '💸', label: 'Pagamento' },
  { value: '🪙', label: 'Moedas' },
  { value: '💲', label: 'Dólar' },
  { value: '🏧', label: 'ATM' },
  { value: '💴', label: 'Yen' },
  { value: '💶', label: 'Euro' },
  { value: '💷', label: 'Libra' },
  { value: '📲', label: 'App Mobile' },
  { value: '🏪', label: 'Loja' },
  { value: '🛒', label: 'Compras' },
  // Secundários
  { value: '💎', label: 'Premium' },
  { value: '🎫', label: 'Vale' },
  { value: '🧾', label: 'Recibo' },
  { value: '📄', label: 'Documento' },
  { value: '✉️', label: 'Envelope' },
  { value: '📮', label: 'Correio' },
  { value: '🔖', label: 'Etiqueta' },
  { value: '🏷️', label: 'Tag' },
  { value: '💌', label: 'Carta' },
  { value: '💹', label: 'Investimento' },
  { value: '📈', label: 'Crescimento' },
  { value: '📊', label: 'Gráfico' },
  { value: '💱', label: 'Câmbio' },
  { value: '🤑', label: 'Rico' },
  { value: '💯', label: 'Cem' },
  { value: '🔢', label: 'Números' },
  { value: '💼', label: 'Negócios' },
  { value: '🎯', label: 'Alvo' },
  { value: '🏅', label: 'Medalha' },
  { value: '🏆', label: 'Troféu' },
  // Coloridos
  { value: '🔴', label: 'Vermelho' },
  { value: '🟠', label: 'Laranja' },
  { value: '🟡', label: 'Amarelo' },
  { value: '🟢', label: 'Verde' },
  { value: '🔵', label: 'Azul' },
  { value: '🟣', label: 'Roxo' },
  { value: '⚫', label: 'Preto' },
  { value: '⚪', label: 'Branco' },
  { value: '🟤', label: 'Marrom' }
];

// Campos do formulário
const paymentMethodFields = [
  {
    name: 'name',
    type: 'text',
    label: 'Nome da Forma de Pagamento',
    placeholder: 'Ex: Cartão Crédito, PIX, Dinheiro',
    icon: 'credit-card',
    maxLength: 30,
    helper: 'Escolha um nome único e fácil de identificar'
  },
  {
    name: 'icon',
    type: 'select',
    label: 'Ícone da Forma de Pagamento',
    options: AVAILABLE_PAYMENT_ICONS,
    helper: 'Selecione o ícone que melhor representa esta forma de pagamento'
  }
];

// Validações do formulário
const validationRules = {
  name: {
    required: true,
    minLength: 2,
    minLengthMessage: 'Nome deve ter pelo menos 2 caracteres',
    custom: (value) => {
      if (value && value.length > 30) {
        return 'Nome não pode ter mais de 30 caracteres';
      }
      return '';
    }
  },
  icon: {
    required: true,
    requiredMessage: 'Escolha um ícone para a forma de pagamento'
  }
};

export default function PaymentMethodForm({ visible, paymentMethod, onClose, onSaved }) {
  const db = useSQLiteContext();
  const { user } = useAuth();

  // Função de salvamento
  const handleSave = async (formData) => {
    if (!user) {
      throw new Error('Você precisa estar logado para gerenciar formas de pagamento.');
    }

    const data = {
      name: formData.name.trim(),
      icon: formData.icon,
      user_id: user.id
    };

    try {
      if (paymentMethod?.id) {
        // Verificar se já existe outra forma de pagamento com o mesmo nome
        const existingMethod = await db.getFirstAsync(
          'SELECT id FROM payment_methods WHERE LOWER(name) = LOWER(?) AND user_id = ? AND id != ?',
          [data.name, user.id, paymentMethod.id]
        );

        if (existingMethod) {
          throw new Error('Já existe uma forma de pagamento com este nome.');
        }

        // Atualização
        await db.runAsync(
          `UPDATE payment_methods 
           SET name = ?, icon = ?
           WHERE id = ? AND user_id = ?`,
          [data.name, data.icon, paymentMethod.id, user.id]
        );
        
        console.log('✅ Forma de pagamento atualizada:', paymentMethod.id);
      } else {
        // Verificar se já existe forma de pagamento com o mesmo nome
        const existingMethod = await db.getFirstAsync(
          'SELECT id FROM payment_methods WHERE LOWER(name) = LOWER(?) AND user_id = ?',
          [data.name, user.id]
        );

        if (existingMethod) {
          throw new Error('Já existe uma forma de pagamento com este nome.');
        }

        // Inserção
        const result = await db.runAsync(
          'INSERT INTO payment_methods (name, icon, user_id) VALUES (?, ?, ?)',
          [data.name, data.icon, data.user_id]
        );
        
        console.log('✅ Nova forma de pagamento criada com ID:', result.lastInsertRowId);
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
      console.error('❌ Erro ao salvar forma de pagamento:', error);
      throw new Error(error.message || 'Não foi possível salvar a forma de pagamento. Tente novamente.');
    }
  };

  // Valores iniciais do formulário
  const initialValues = {
    name: paymentMethod?.name || '',
    icon: paymentMethod?.icon || '💳'
  };

  return (
    <ModalForm
      visible={visible}
      onClose={onClose}
      onSubmit={handleSave}
      title={paymentMethod?.id ? 'Editar Forma de Pagamento' : 'Nova Forma de Pagamento'}
      subtitle={paymentMethod?.id ? 'Atualize as informações da forma de pagamento' : 'Preencha os dados da nova forma de pagamento'}
      fields={paymentMethodFields}
      validationRules={validationRules}
      initialValues={initialValues}
      submitText={paymentMethod?.id ? 'Atualizar' : 'Salvar'}
      cancelText='Cancelar'
    />
  );
}