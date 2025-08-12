// components/PaymentMethodList.js - LISTA DE FORMAS DE PAGAMENTO PADRONIZADA
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Keyboard
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuth } from '../services/AuthContext';
import {
  NUBANK_COLORS,
  NUBANK_SPACING,
  NUBANK_FONT_SIZES,
  NUBANK_BORDER_RADIUS,
  NUBANK_SHADOWS,
  NUBANK_FONT_WEIGHTS
} from '../constants/nubank-theme';

export default function PaymentMethodList({ onEdit, onAdd, refreshTrigger }) {
  const db = useSQLiteContext();
  const { user } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');

  // Carrega dados quando componente monta ou refreshTrigger muda
  useEffect(() => {
    if (db && user) {
      loadPaymentMethods();
    }
  }, [db, user, refreshTrigger]);

  const loadPaymentMethods = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const result = await db.getAllAsync(
        'SELECT * FROM payment_methods WHERE user_id = ? ORDER BY name',
        [user.id]
      );
      setPaymentMethods(result || []);
    } catch (error) {
      console.error('❌ Erro ao carregar formas de pagamento:', error);
      Alert.alert('Erro', 'Não foi possível carregar as formas de pagamento.', [
        { text: 'Entendi' }
      ]);
    } finally {
      setLoading(false);
    }
  }, [db, user]);

  const handleDelete = async (paymentMethod) => {
    if (!user) return;

    try {
      // Verifica se há despesas usando esta forma de pagamento
      const expenses = await db.getFirstAsync(
        'SELECT COUNT(*) as count FROM expenses WHERE payment_method_id = ? AND user_id = ?',
        [paymentMethod.id, user.id]
      );

      let warningMessage = `Deseja excluir a forma de pagamento "${paymentMethod.name}"?`;

      if (expenses && expenses.count > 0) {
        warningMessage += `\n\n⚠️ Atenção: ${expenses.count} despesa(s) estão usando esta forma de pagamento e ficarão sem forma de pagamento.`;
      }

      Alert.alert('Confirmar Exclusão', warningMessage + '\n\nEsta ação não pode ser desfeita.', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await db.runAsync('DELETE FROM payment_methods WHERE id = ? AND user_id = ?', [
                paymentMethod.id,
                user.id
              ]);

              // Notifica outros componentes
              if (global.expenseListeners) {
                global.expenseListeners.forEach(listener => listener());
              }

              await loadPaymentMethods();
              Alert.alert('Sucesso', `Forma de pagamento "${paymentMethod.name}" excluída!`, [
                { text: 'Entendi' }
              ]);
            } catch (error) {
              console.error('❌ Erro ao excluir forma de pagamento:', error);
              Alert.alert('Erro', 'Não foi possível excluir a forma de pagamento.', [
                { text: 'Entendi' }
              ]);
            }
          }
        }
      ]);
    } catch (error) {
      console.error('❌ Erro ao verificar dependências:', error);
      Alert.alert('Erro', 'Não foi possível verificar se esta forma de pagamento está em uso.', [
        { text: 'Entendi' }
      ]);
    }
  };

  // Filtra formas de pagamento baseado na pesquisa
  const filteredMethods = paymentMethods.filter(method =>
    method.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const renderPaymentMethod = ({ item }) => (
    <View style={styles.methodCard}>
      <TouchableOpacity
        style={styles.methodContent}
        onPress={() => onEdit && onEdit(item)}
        activeOpacity={0.7}
      >
        <View style={styles.methodIconContainer}>
          <Text style={styles.methodIcon}>{item.icon || '💳'}</Text>
        </View>

        <View style={styles.methodInfo}>
          <Text style={styles.methodName}>{item.name}</Text>
        </View>

        <MaterialCommunityIcons
          name="pencil"
          size={16}
          color={NUBANK_COLORS.TEXT_TERTIARY}
          style={styles.editIcon}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDelete(item)}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons
          name="delete-outline"
          size={20}
          color={NUBANK_COLORS.ERROR}
        />
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons
        name="credit-card-off-outline"
        size={64}
        color={NUBANK_COLORS.TEXT_TERTIARY}
        style={styles.emptyIcon}
      />
      <Text style={styles.emptyTitle}>Nenhuma forma de pagamento</Text>
      <Text style={styles.emptySubtitle}>
        Adicione cartões, dinheiro, PIX e outras formas de pagamento!
      </Text>
      <TouchableOpacity style={styles.emptyButton} onPress={onAdd}>
        <MaterialCommunityIcons name="plus" size={20} color={NUBANK_COLORS.TEXT_WHITE} />
        <Text style={styles.emptyButtonText}>Adicionar Primeira Forma</Text>
      </TouchableOpacity>
    </View>
  );

  const renderNoResults = () => (
    <View style={styles.noResultsContainer}>
      <MaterialCommunityIcons
        name="magnify"
        size={48}
        color={NUBANK_COLORS.TEXT_TERTIARY}
        style={styles.noResultsIcon}
      />
      <Text style={styles.noResultsTitle}>Nenhuma forma encontrada</Text>
      <Text style={styles.noResultsSubtitle}>
        Tente pesquisar com outros termos ou crie uma nova forma
      </Text>
      <TouchableOpacity
        style={styles.createFromSearchButton}
        onPress={() => {
          if (onAdd) onAdd(searchText);
        }}
      >
        <MaterialCommunityIcons name="plus" size={16} color={NUBANK_COLORS.PRIMARY} />
        <Text style={styles.createFromSearchText}>Criar forma "{searchText}"</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={NUBANK_COLORS.PRIMARY} />
        <Text style={styles.loadingText}>Carregando formas de pagamento...</Text>
      </View>
    );
  }

  // Função para forçar recarregamento
  const forceReload = () => {
    loadPaymentMethods();
  };

  return (
    <View style={styles.container}>
      {/* Barra de pesquisa - só aparece se houver formas de pagamento */}
      {paymentMethods.length > 0 && (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <MaterialCommunityIcons
              name="magnify"
              size={20}
              color={NUBANK_COLORS.TEXT_TERTIARY}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Pesquisar formas de pagamento..."
              placeholderTextColor={NUBANK_COLORS.TEXT_TERTIARY}
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={() => Keyboard.dismiss()}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchText.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchText('')}
                style={styles.clearButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={20}
                  color={NUBANK_COLORS.TEXT_TERTIARY}
                />
              </TouchableOpacity>
            )}
          </View>

          {searchText.length > 0 && (
            <Text style={styles.searchResults}>
              {filteredMethods.length === 0
                ? 'Nenhuma forma encontrada'
                : `${filteredMethods.length} forma${filteredMethods.length !== 1 ? 's' : ''} encontrada${filteredMethods.length !== 1 ? 's' : ''}`}
            </Text>
          )}
        </View>
      )}

      {/* Header da lista com contador e refresh */}
      {paymentMethods.length > 0 && (
        <View style={styles.listHeader}>
          <Text style={styles.listHeaderText}>
            {searchText.trim() ? (
              `${filteredMethods.length} de ${paymentMethods.length} forma${paymentMethods.length !== 1 ? 's' : ''} de pagamento`
            ) : (
              `${paymentMethods.length} forma${paymentMethods.length !== 1 ? 's' : ''} de pagamento cadastrada${paymentMethods.length !== 1 ? 's' : ''}`
            )}
          </Text>
          <TouchableOpacity onPress={forceReload} style={styles.refreshButton}>
            <MaterialCommunityIcons
              name="refresh"
              size={18}
              color={NUBANK_COLORS.TEXT_SECONDARY}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Lista */}
      {paymentMethods.length === 0 ? (
        renderEmptyState()
      ) : filteredMethods.length === 0 ? (
        renderNoResults()
      ) : (
        <FlatList
          data={filteredMethods}
          keyExtractor={item => `payment-method-${item.id}`}
          renderItem={renderPaymentMethod}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NUBANK_COLORS.BACKGROUND_SECONDARY
  },

  // Search
  searchContainer: {
    paddingHorizontal: NUBANK_SPACING.LG,
    paddingVertical: NUBANK_SPACING.MD,
    backgroundColor: NUBANK_COLORS.BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: NUBANK_COLORS.CARD_BORDER
  },

  // List header
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: NUBANK_SPACING.LG,
    paddingVertical: NUBANK_SPACING.SM,
    backgroundColor: NUBANK_COLORS.BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: NUBANK_COLORS.CARD_BORDER
  },

  listHeaderText: {
    fontSize: NUBANK_FONT_SIZES.SM,
    color: NUBANK_COLORS.TEXT_SECONDARY,
    fontWeight: NUBANK_FONT_WEIGHTS.MEDIUM
  },

  refreshButton: {
    padding: NUBANK_SPACING.XS
  },

  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NUBANK_COLORS.BACKGROUND_SECONDARY,
    borderRadius: NUBANK_BORDER_RADIUS.LG,
    paddingHorizontal: NUBANK_SPACING.MD,
    borderWidth: 1,
    borderColor: NUBANK_COLORS.CARD_BORDER
  },

  searchIcon: {
    marginRight: NUBANK_SPACING.SM
  },

  searchInput: {
    flex: 1,
    fontSize: NUBANK_FONT_SIZES.MD,
    color: NUBANK_COLORS.TEXT_PRIMARY,
    paddingVertical: NUBANK_SPACING.MD
  },

  clearButton: {
    padding: NUBANK_SPACING.SM
  },

  searchResults: {
    fontSize: NUBANK_FONT_SIZES.XS,
    color: NUBANK_COLORS.TEXT_SECONDARY,
    marginTop: NUBANK_SPACING.SM,
    marginLeft: NUBANK_SPACING.SM
  },

  // List
  list: {
    padding: NUBANK_SPACING.LG
  },

  separator: {
    height: NUBANK_SPACING.SM
  },

  methodCard: {
    backgroundColor: NUBANK_COLORS.BACKGROUND,
    borderRadius: NUBANK_BORDER_RADIUS.LG,
    flexDirection: 'row',
    alignItems: 'center',
    ...NUBANK_SHADOWS.SM,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: NUBANK_COLORS.CARD_BORDER
  },

  methodContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: NUBANK_SPACING.LG
  },

  methodIconContainer: {
    width: 48,
    height: 48,
    borderRadius: NUBANK_BORDER_RADIUS.LG,
    backgroundColor: NUBANK_COLORS.BACKGROUND_TERTIARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: NUBANK_SPACING.MD,
    borderWidth: 1,
    borderColor: NUBANK_COLORS.CARD_BORDER
  },

  methodIcon: {
    fontSize: 20
  },

  methodInfo: {
    flex: 1
  },

  methodName: {
    fontSize: NUBANK_FONT_SIZES.MD,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD,
    color: NUBANK_COLORS.TEXT_PRIMARY
  },

  editIcon: {
    marginLeft: NUBANK_SPACING.SM
  },

  deleteButton: {
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: NUBANK_SPACING.LG,
    minWidth: 60,
    alignSelf: 'stretch',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(239, 68, 68, 0.1)'
  },

  // Empty states
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: NUBANK_SPACING.XXL
  },

  emptyIcon: {
    marginBottom: NUBANK_SPACING.LG
  },

  emptyTitle: {
    fontSize: NUBANK_FONT_SIZES.XL,
    fontWeight: NUBANK_FONT_WEIGHTS.BOLD,
    color: NUBANK_COLORS.TEXT_PRIMARY,
    marginBottom: NUBANK_SPACING.SM,
    textAlign: 'center'
  },

  emptySubtitle: {
    fontSize: NUBANK_FONT_SIZES.MD,
    color: NUBANK_COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: NUBANK_SPACING.XL
  },

  emptyButton: {
    backgroundColor: NUBANK_COLORS.PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: NUBANK_SPACING.XL,
    paddingVertical: NUBANK_SPACING.MD,
    borderRadius: NUBANK_BORDER_RADIUS.LG,
    ...NUBANK_SHADOWS.MD
  },

  emptyButtonText: {
    color: NUBANK_COLORS.TEXT_WHITE,
    fontSize: NUBANK_FONT_SIZES.MD,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD,
    marginLeft: NUBANK_SPACING.SM
  },

  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: NUBANK_SPACING.XXL
  },

  noResultsIcon: {
    marginBottom: NUBANK_SPACING.LG
  },

  noResultsTitle: {
    fontSize: NUBANK_FONT_SIZES.LG,
    fontWeight: NUBANK_FONT_WEIGHTS.BOLD,
    color: NUBANK_COLORS.TEXT_PRIMARY,
    marginBottom: NUBANK_SPACING.SM,
    textAlign: 'center'
  },

  noResultsSubtitle: {
    fontSize: NUBANK_FONT_SIZES.SM,
    color: NUBANK_COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: NUBANK_SPACING.LG
  },

  createFromSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: NUBANK_SPACING.LG,
    paddingVertical: NUBANK_SPACING.SM,
    borderRadius: NUBANK_BORDER_RADIUS.MD,
    borderWidth: 1,
    borderColor: '#DBEAFE'
  },

  createFromSearchText: {
    color: '#3B82F6',
    fontSize: NUBANK_FONT_SIZES.SM,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD,
    marginLeft: NUBANK_SPACING.SM
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: NUBANK_COLORS.BACKGROUND
  },

  loadingText: {
    marginTop: NUBANK_SPACING.MD,
    fontSize: NUBANK_FONT_SIZES.MD,
    color: NUBANK_COLORS.TEXT_SECONDARY,
    fontWeight: NUBANK_FONT_WEIGHTS.MEDIUM
  }
});