// components/EstablishmentCategoryList.js - LISTA DE CATEGORIAS DE ESTABELECIMENTOS
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert
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

export default function EstablishmentCategoryList({ onEdit, searchQuery = '', refreshKey }) {
  const db = useSQLiteContext();
  const { user } = useAuth();

  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (db && user) {
      loadCategories();
    }
  }, [db, user, refreshKey]);

  // Filtro de pesquisa
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCategories(categories);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = categories.filter(category => {
        return category.name?.toLowerCase().includes(query);
      });
      setFilteredCategories(filtered);
    }
  }, [searchQuery, categories]);

  async function loadCategories() {
    if (!user) {
      console.log('⚠️ Usuário não definido, não é possível carregar categorias');
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 Carregando categorias de estabelecimentos do usuário:', user.id);

      let results = [];
      
      // Query defensiva - verifica se tabela establishment_categories existe
      try {
        results = await db.getAllAsync(
          'SELECT * FROM establishment_categories WHERE user_id = ? ORDER BY name ASC',
          [user.id]
        );
      } catch (tableError) {
        console.log('⚠️ Tabela establishment_categories não existe ainda');
        
        // Se a tabela não existe, retorna array vazio
        results = [];
        
        // Exibe aviso amigável ao usuário
        Alert.alert(
          'Atualização Necessária',
          'A funcionalidade de categorias de estabelecimentos requer uma atualização do banco de dados.\n\n🔄 Para ativar esta funcionalidade:\n1. Feche o aplicativo completamente\n2. Abra novamente\n3. A atualização será aplicada automaticamente',
          [{ text: 'Entendi' }]
        );
      }

      console.log(`✅ ${results?.length || 0} categorias de estabelecimentos encontradas`);
      setCategories(results || []);
      setFilteredCategories(results || []);
    } catch (e) {
      console.error('❌ Erro ao carregar categorias de estabelecimentos:', e);
      Alert.alert('Erro', 'Não foi possível carregar as categorias.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id, name) {
    if (!user) return;

    Alert.alert(
      '⚠️ Confirmar Exclusão',
      `Deseja excluir a categoria de estabelecimento "${name}"?\n\nEsta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await db.runAsync(
                'DELETE FROM establishment_categories WHERE id = ? AND user_id = ?',
                [id, user.id]
              );

              console.log('✅ Categoria de estabelecimento excluída:', id);
              await loadCategories();

              // Notifica listeners globais
              if (global.expenseListeners) {
                global.expenseListeners.forEach(listener => listener());
              }

              Alert.alert('Sucesso', 'Categoria excluída!');
            } catch (error) {
              console.error('❌ Erro ao excluir categoria:', error);
              Alert.alert('Erro', 'Não foi possível excluir a categoria.');
            }
          }
        }
      ]
    );
  }

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardContent} onPress={() => onEdit(item)}>
        <View style={styles.iconContainer}>
          <Text style={styles.categoryIcon}>{item.icon || '🏪'}</Text>
        </View>
        
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryName}>{item.name}</Text>
          <Text style={styles.categoryDate}>
            Criada em {new Date(item.created_at).toLocaleDateString('pt-BR')}
          </Text>
        </View>

        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={NUBANK_COLORS.TEXT_TERTIARY}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDelete(item.id, item.name)}
      >
        <MaterialCommunityIcons
          name="delete"
          size={20}
          color={NUBANK_COLORS.ERROR}
        />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color={NUBANK_COLORS.PRIMARY} />
        <Text style={styles.loadingText}>Carregando categorias...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>⚠️</Text>
        <Text style={styles.emptyTitle}>Faça login</Text>
        <Text style={styles.emptySubtitle}>
          É necessário estar logado para ver suas categorias
        </Text>
      </View>
    );
  }

  if (categories.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📂</Text>
        <Text style={styles.emptyTitle}>Nenhuma categoria</Text>
        <Text style={styles.emptySubtitle}>
          Toque no botão "+" para criar sua primeira categoria de estabelecimento
        </Text>
        <Text style={styles.emptyHint}>
          💡 Se o botão "+" não funcionar, feche e reabra o aplicativo
        </Text>
      </View>
    );
  }

  // Estado vazio para pesquisa
  if (searchQuery.trim() && filteredCategories.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🔍</Text>
        <Text style={styles.emptyTitle}>Nenhum resultado</Text>
        <Text style={styles.emptySubtitle}>
          Não encontramos categorias com "{searchQuery}"
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.listHeader}>
        <Text style={styles.listHeaderText}>
          {searchQuery.trim() ? (
            `${filteredCategories.length} de ${categories.length} categoria${categories.length !== 1 ? 's' : ''}`
          ) : (
            `${categories.length} categoria${categories.length !== 1 ? 's' : ''} de estabelecimento${categories.length !== 1 ? 's' : ''}`
          )}
        </Text>
      </View>

      <FlatList
        data={filteredCategories}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NUBANK_COLORS.BACKGROUND
  },
  
  listHeader: {
    paddingHorizontal: NUBANK_SPACING.LG,
    paddingVertical: NUBANK_SPACING.MD,
    backgroundColor: NUBANK_COLORS.BACKGROUND_SECONDARY,
    borderBottomWidth: 1,
    borderBottomColor: NUBANK_COLORS.BORDER
  },
  
  listHeaderText: {
    fontSize: NUBANK_FONT_SIZES.SM,
    color: NUBANK_COLORS.TEXT_SECONDARY,
    fontWeight: NUBANK_FONT_WEIGHTS.MEDIUM
  },
  
  list: {
    padding: NUBANK_SPACING.LG
  },
  
  separator: {
    height: NUBANK_SPACING.MD
  },
  
  card: {
    backgroundColor: NUBANK_COLORS.BACKGROUND,
    borderRadius: NUBANK_BORDER_RADIUS.LG,
    flexDirection: 'row',
    alignItems: 'center',
    ...NUBANK_SHADOWS.MD,
    borderWidth: 1,
    borderColor: NUBANK_COLORS.BORDER
  },
  
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: NUBANK_SPACING.LG
  },
  
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: NUBANK_BORDER_RADIUS.ROUND,
    backgroundColor: NUBANK_COLORS.BACKGROUND_SECONDARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: NUBANK_SPACING.MD
  },
  
  categoryIcon: {
    fontSize: 24
  },
  
  categoryInfo: {
    flex: 1
  },
  
  categoryName: {
    fontSize: NUBANK_FONT_SIZES.LG,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD,
    color: NUBANK_COLORS.TEXT_PRIMARY,
    marginBottom: NUBANK_SPACING.XS
  },
  
  categorySubtitle: {
    fontSize: NUBANK_FONT_SIZES.MD,
    fontWeight: NUBANK_FONT_WEIGHTS.MEDIUM,
    color: NUBANK_COLORS.PRIMARY,
    marginBottom: NUBANK_SPACING.XS
  },
  
  categoryDate: {
    fontSize: NUBANK_FONT_SIZES.SM,
    color: NUBANK_COLORS.TEXT_SECONDARY
  },
  
  deleteButton: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: NUBANK_COLORS.BORDER
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: NUBANK_SPACING.XL
  },
  
  loadingText: {
    marginTop: NUBANK_SPACING.MD,
    color: NUBANK_COLORS.TEXT_SECONDARY,
    fontSize: NUBANK_FONT_SIZES.MD
  },
  
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: NUBANK_SPACING.XL
  },
  
  emptyIcon: {
    fontSize: 64,
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
    marginBottom: NUBANK_SPACING.MD
  },
  
  emptyHint: {
    fontSize: NUBANK_FONT_SIZES.SM,
    color: NUBANK_COLORS.TEXT_TERTIARY,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20
  }
});