// components/EstablishmentList.js - VERSÃO CORRIGIDA COM FILTRO USER_ID
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
import { useSQLiteContext } from 'expo-sqlite';
import { useAuth } from '../services/AuthContext'; // IMPORTANTE: Importar useAuth
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  NUBANK_COLORS,
  NUBANK_SPACING,
  NUBANK_FONT_SIZES,
  NUBANK_BORDER_RADIUS,
  NUBANK_SHADOWS,
  NUBANK_FONT_WEIGHTS
} from '../constants/nubank-theme';

export default function EstablishmentList({ onEdit, searchQuery = '' }) {
  const db = useSQLiteContext();
  const { user } = useAuth(); // IMPORTANTE: Pegar o usuário logado

  const [establishments, setEstablishments] = useState([]);
  const [filteredEstablishments, setFilteredEstablishments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (db && user) {
      loadEstablishments();
    }
  }, [db, user, refreshKey]);

  // Filtro de pesquisa
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredEstablishments(establishments);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = establishments.filter(establishment => {
        return (
          establishment.name?.toLowerCase().includes(query) ||
          establishment.category_names?.toLowerCase().includes(query) ||
          establishment.category?.toLowerCase().includes(query) || // Fallback para formato legado
          establishment.street?.toLowerCase().includes(query) ||
          establishment.district?.toLowerCase().includes(query) ||
          establishment.city?.toLowerCase().includes(query) ||
          establishment.state?.toLowerCase().includes(query) ||
          establishment.phone?.toLowerCase().includes(query)
        );
      });
      setFilteredEstablishments(filtered);
    }
  }, [searchQuery, establishments]);

  async function loadEstablishments() {
    if (!user) {
      console.log('⚠️ Usuário não definido, não é possível carregar estabelecimentos');
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 Carregando estabelecimentos do usuário:', user.id);

      // Query defensiva - verifica se tabelas de categorias existem
      let results;
      try {
        // Tenta primeiro a query com JOIN usando establishment_categories
        results = await db.getAllAsync(
          `
          SELECT 
            e.id,
            e.name,
            e.street,
            e.number,
            e.district,
            e.city,
            e.state,
            e.zipcode,
            e.phone,
            e.latitude,
            e.longitude,
            e.created_at,
            e.updated_at,
            e.user_id,
            GROUP_CONCAT(c.name, ', ') as category_names,
            GROUP_CONCAT(CASE WHEN c.icon IS NULL OR c.icon = '' OR c.icon = '?' OR c.icon = '�' THEN '🏪' ELSE c.icon END, ',') as category_icons,
            GROUP_CONCAT(c.id, ',') as category_ids
          FROM establishments e
          LEFT JOIN establishment_category ec ON e.id = ec.establishment_id AND ec.user_id = ?
          LEFT JOIN establishment_categories c ON ec.category_id = c.id AND c.user_id = ?
          WHERE e.user_id = ?
          GROUP BY e.id
          ORDER BY e.name ASC
        `,
          [user.id, user.id, user.id]
        );
      } catch (newTableError) {
        console.log('⚠️ Tabela establishment_categories não existe, tentando com categories...');
        
        try {
          // Fallback para tabela categories antiga
          results = await db.getAllAsync(
            `
            SELECT 
              e.id,
              e.name,
              e.street,
              e.number,
              e.district,
              e.city,
              e.state,
              e.zipcode,
              e.phone,
              e.latitude,
              e.longitude,
              e.created_at,
              e.updated_at,
              e.user_id,
              GROUP_CONCAT(c.name, ', ') as category_names,
              GROUP_CONCAT(CASE WHEN c.icon IS NULL OR c.icon = '' OR c.icon = '?' OR c.icon = '�' THEN '🏪' ELSE c.icon END, ',') as category_icons,
              GROUP_CONCAT(c.id, ',') as category_ids
            FROM establishments e
            LEFT JOIN establishment_category ec ON e.id = ec.establishment_id AND ec.user_id = ?
            LEFT JOIN categories c ON ec.category_id = c.id AND c.user_id = ?
            WHERE e.user_id = ?
            GROUP BY e.id
            ORDER BY e.name ASC
          `,
            [user.id, user.id, user.id]
          );
        } catch (joinError) {
          console.log('⚠️ Tabela establishment_category não existe ainda, usando query simples');
          // Fallback para query simples se tabelas não existem
          results = await db.getAllAsync(
            'SELECT * FROM establishments WHERE user_id = ? ORDER BY name ASC',
            [user.id]
          );
        }
      }

      console.log(
        `✅ ${results?.length || 0} estabelecimentos encontrados para o usuário ${user.id}`
      );
      
      
      setEstablishments(results || []);
      setFilteredEstablishments(results || []);
    } catch (e) {
      console.error('❌ Erro ao carregar estabelecimentos:', e);
      Alert.alert('Erro', 'Não foi possível carregar os estabelecimentos.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id, name) {
    if (!user) return;

    Alert.alert(
      '⚠️ Confirmar Exclusão',
      `Deseja excluir "${name}"?\n\nEsta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              // IMPORTANTE: Garante que só exclui estabelecimentos do usuário
              await db.runAsync('DELETE FROM establishments WHERE id = ? AND user_id = ?', [
                id,
                user.id
              ]);

              console.log('✅ Estabelecimento excluído:', id);

              // Recarrega a lista
              await loadEstablishments();

              // Notifica listeners globais
              if (global.expenseListeners) {
                global.expenseListeners.forEach(listener => listener());
              }

              Alert.alert('Sucesso', 'Estabelecimento excluído!');
            } catch (error) {
              console.error('❌ Erro ao excluir:', error);
              Alert.alert('Erro', 'Não foi possível excluir o estabelecimento.');
            }
          }
        }
      ]
    );
  }

  // Função para forçar recarregamento
  const forceReload = () => {
    setRefreshKey(prev => prev + 1);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardContent} onPress={() => onEdit(item)}>
        <View style={styles.cardMain}>
          <View style={styles.nameContainer}>
            <Text style={styles.name}>{item.name}</Text>
            {/* Exibe categorias (novo formato) ou categoria única (formato legado) */}
            {item.category_names && item.category_names !== 'null' && item.category_names.trim() !== '' ? (
              <View style={styles.categoriesContainer}>
                {item.category_names.split(', ').map((categoryName, index) => {
                  // Pega o ícone da posição correspondente ou usa padrão
                  const categoryIcons = item.category_icons ? item.category_icons.split(',') : [];
                  const categoryIcon = categoryIcons[index] || '🏪';
                  
                  return (
                    <Text key={index} style={styles.category}>
                      {categoryIcon} {categoryName}
                    </Text>
                  );
                })}
              </View>
            ) : item.category && item.category.trim() !== '' ? (
              <Text style={styles.category}>📂 {item.category}</Text>
            ) : (
              <Text style={styles.categoryEmpty}>📂 Sem categoria</Text>
            )}
          </View>

          {(item.street || item.number || item.district || item.city) && (
            <Text style={styles.address} numberOfLines={2}>
              📍{' '}
              {[
                item.street && item.number ? `${item.street}, ${item.number}` : item.street,
                item.district,
                item.city,
                item.state
              ]
                .filter(Boolean)
                .join(' - ')}
            </Text>
          )}

          <View style={styles.bottomInfo}>
            {item.phone && <Text style={styles.phone}>📞 {item.phone}</Text>}

            {item.latitude && item.longitude && (
              <View style={styles.gpsTag}>
                <Text style={styles.gpsText}>🌐 GPS</Text>
              </View>
            )}
          </View>
        </View>
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
        <ActivityIndicator size='large' color='#3b82f6' />
        <Text style={styles.loadingText}>Carregando estabelecimentos...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>⚠️</Text>
        <Text style={styles.emptyTitle}>Faça login</Text>
        <Text style={styles.emptySubtitle}>
          É necessário estar logado para ver seus estabelecimentos
        </Text>
      </View>
    );
  }

  if (establishments.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🏪</Text>
        <Text style={styles.emptyTitle}>Nenhum estabelecimento</Text>
        <Text style={styles.emptySubtitle}>
          Toque em "+ Novo" para adicionar seus locais favoritos
        </Text>
        <TouchableOpacity style={styles.reloadButton} onPress={forceReload}>
          <Text style={styles.reloadButtonText}>🔄 Recarregar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Estado vazio para pesquisa
  if (searchQuery.trim() && filteredEstablishments.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🔍</Text>
        <Text style={styles.emptyTitle}>Nenhum resultado</Text>
        <Text style={styles.emptySubtitle}>
          Não encontramos estabelecimentos com "{searchQuery}"
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.listHeader}>
        <Text style={styles.listHeaderText}>
          {searchQuery.trim() ? (
            `${filteredEstablishments.length} de ${establishments.length} estabelecimento${establishments.length !== 1 ? 's' : ''}`
          ) : (
            `${establishments.length} estabelecimento${establishments.length !== 1 ? 's' : ''} cadastrado${establishments.length !== 1 ? 's' : ''}`
          )}
        </Text>
      </View>

      <FlatList
        data={filteredEstablishments}
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
  cardMain: {
    flex: 1
  },
  nameContainer: {
    marginBottom: 8
  },
  name: {
    fontSize: NUBANK_FONT_SIZES.LG,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD,
    color: NUBANK_COLORS.TEXT_PRIMARY,
    marginBottom: NUBANK_SPACING.XS
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  category: {
    fontSize: NUBANK_FONT_SIZES.MD,
    color: NUBANK_COLORS.PRIMARY,
    fontWeight: NUBANK_FONT_WEIGHTS.MEDIUM,
    marginRight: NUBANK_SPACING.SM
  },
  categoryEmpty: {
    fontSize: NUBANK_FONT_SIZES.SM,
    color: NUBANK_COLORS.TEXT_TERTIARY,
    fontWeight: NUBANK_FONT_WEIGHTS.REGULAR,
    fontStyle: 'italic'
  },
  address: {
    fontSize: NUBANK_FONT_SIZES.SM,
    color: NUBANK_COLORS.TEXT_SECONDARY,
    marginBottom: NUBANK_SPACING.SM,
    lineHeight: 20
  },
  bottomInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  phone: {
    fontSize: NUBANK_FONT_SIZES.SM,
    color: NUBANK_COLORS.TEXT_SECONDARY
  },
  gpsTag: {
    backgroundColor: `${NUBANK_COLORS.PRIMARY}15`,
    paddingHorizontal: NUBANK_SPACING.SM,
    paddingVertical: NUBANK_SPACING.XS,
    borderRadius: NUBANK_BORDER_RADIUS.SM
  },
  gpsText: {
    fontSize: NUBANK_FONT_SIZES.XS,
    color: NUBANK_COLORS.PRIMARY,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD
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
    padding: NUBANK_SPACING.XXL
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: NUBANK_FONT_SIZES.XL,
    fontWeight: NUBANK_FONT_WEIGHTS.BOLD,
    color: NUBANK_COLORS.TEXT_PRIMARY,
    marginBottom: NUBANK_SPACING.SM
  },
  emptySubtitle: {
    fontSize: NUBANK_FONT_SIZES.MD,
    color: NUBANK_COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: NUBANK_SPACING.XL
  },
  reloadButton: {
    backgroundColor: NUBANK_COLORS.PRIMARY,
    paddingHorizontal: NUBANK_SPACING.LG,
    paddingVertical: NUBANK_SPACING.MD,
    borderRadius: NUBANK_BORDER_RADIUS.LG
  },
  reloadButtonText: {
    color: NUBANK_COLORS.TEXT_WHITE,
    fontSize: NUBANK_FONT_SIZES.MD,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD
  }
});
