// components/IncomeManager.js - GERENCIADOR DE RECEITAS COM DESIGN NUBANK
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuth } from '../services/AuthContext';
import { formatCurrency, formatDate } from '../utils/helpers';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  FadeInView,
  SlideInView,
  FloatingActionButton
} from './AnimatedComponents';
import {
  ChipGroup,
  SearchBar,
  EmptyState
} from './UIComponents';
import {
  NUBANK_COLORS,
  NUBANK_SPACING,
  NUBANK_FONT_SIZES,
  NUBANK_BORDER_RADIUS,
  NUBANK_SHADOWS,
  NUBANK_FONT_WEIGHTS
} from '../constants/nubank-theme';
import IncomeForm from './IncomeForm';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function IncomeManager() {
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const { user } = useAuth();

  // Estados principais
  const [incomes, setIncomes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [establishments, setEstablishments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Estados do modal
  const [showModal, setShowModal] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);
  const [modalStep, setModalStep] = useState(1);

  // Estados de filtro
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [showFilters, setShowFilters] = useState(false);

  // Estados de animação
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Carregar dados iniciais
  useEffect(() => {
    if (user?.id) {
      loadInitialData();
    }
  }, [user?.id]);

  // Configurar listeners globais
  useEffect(() => {
    // Listener para atualizações de receitas
    if (!global.incomeListeners) {
      global.incomeListeners = [];
    }
    global.incomeListeners.push(loadIncomes);

    return () => {
      if (global.incomeListeners) {
        global.incomeListeners = global.incomeListeners.filter(
          listener => listener !== loadIncomes
        );
      }
    };
  }, []);

  // Animações de entrada
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadIncomes(),
        loadCategories(),
        loadPaymentMethods(),
        loadEstablishments()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
      Alert.alert('Erro', 'Falha ao carregar dados das receitas');
    } finally {
      setLoading(false);
    }
  };

  const loadIncomes = useCallback(async () => {
    if (!user?.id) return;

    try {
      const result = await db.getAllAsync(`
        SELECT 
          i.*,
          c.name as categoryName,
          c.icon as categoryIcon,
          pm.name as paymentMethodName,
          pm.icon as paymentMethodIcon,
          e.name as establishmentName
        FROM incomes i
        LEFT JOIN categories c ON i.categoryId = c.id
        LEFT JOIN payment_methods pm ON i.payment_method_id = pm.id
        LEFT JOIN establishments e ON i.establishment_id = e.id
        WHERE i.user_id = ?
        ORDER BY i.date DESC, i.created_at DESC
      `, [user.id]);

      setIncomes(result || []);
    } catch (error) {
      console.error('Erro ao carregar receitas:', error);
      // Se a tabela não existir, inicializa com array vazio
      setIncomes([]);
    }
  }, [db, user?.id]);

  const loadCategories = useCallback(async () => {
    if (!user?.id) return;

    try {
      const result = await db.getAllAsync(`
        SELECT * FROM categories 
        WHERE user_id = ? AND (type = 'receita' OR type IS NULL)
        ORDER BY name
      `, [user.id]);

      setCategories(result || []);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      setCategories([]);
    }
  }, [db, user?.id]);

  const loadPaymentMethods = useCallback(async () => {
    if (!user?.id) return;

    try {
      const result = await db.getAllAsync(`
        SELECT * FROM payment_methods 
        WHERE user_id = ? AND is_active = 1
        ORDER BY name
      `, [user.id]);

      setPaymentMethods(result || []);
    } catch (error) {
      console.error('Erro ao carregar métodos de pagamento:', error);
      setPaymentMethods([]);
    }
  }, [db, user?.id]);

  const loadEstablishments = useCallback(async () => {
    if (!user?.id) return;

    try {
      const result = await db.getAllAsync(`
        SELECT * FROM establishments 
        WHERE user_id = ? AND is_active = 1
        ORDER BY name
      `, [user.id]);

      setEstablishments(result || []);
    } catch (error) {
      console.error('Erro ao carregar estabelecimentos:', error);
      setEstablishments([]);
    }
  }, [db, user?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  }, []);

  const handleAddIncome = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setEditingIncome(null);
    setModalStep(1);
    setShowModal(true);
  };

  const handleEditIncome = (income) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setEditingIncome(income);
    setModalStep(1);
    setShowModal(true);
  };

  const handleDeleteIncome = (income) => {
    Alert.alert(
      'Excluir Receita',
      `Tem certeza que deseja excluir a receita "${income.description}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => deleteIncome(income.id),
        },
      ]
    );
  };

  const deleteIncome = async (incomeId) => {
    try {
      await db.runAsync('DELETE FROM incomes WHERE id = ? AND user_id = ?', [
        incomeId,
        user.id,
      ]);

      await loadIncomes();

      // Notificar outros componentes
      if (global.incomeListeners) {
        global.incomeListeners.forEach(listener => {
          if (typeof listener === 'function') {
            listener();
          }
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Erro ao deletar receita:', error);
      Alert.alert('Erro', 'Falha ao excluir receita');
    }
  };

  const getFilteredIncomes = () => {
    let filtered = incomes || [];

    // Filtro por busca
    if (searchQuery) {
      filtered = filtered.filter(income =>
        income.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        income.categoryName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        income.establishmentName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filtro por categoria
    if (selectedCategory) {
      filtered = filtered.filter(income => income.categoryId === selectedCategory);
    }

    // Filtro por período
    const now = new Date();
    const periodStart = new Date();

    switch (selectedPeriod) {
    case 'today':
      periodStart.setHours(0, 0, 0, 0);
      break;
    case 'week':
      periodStart.setDate(now.getDate() - 7);
      break;
    case 'month':
      periodStart.setMonth(now.getMonth() - 1);
      break;
    case 'year':
      periodStart.setFullYear(now.getFullYear() - 1);
      break;
    default:
      return filtered;
    }

    filtered = filtered.filter(income => new Date(income.date) >= periodStart);

    return filtered;
  };

  const renderIncomeItem = ({ item, index }) => (
    <View style={[styles.incomeCard, NUBANK_SHADOWS.medium]}>
      <TouchableOpacity
        style={styles.incomeContent}
        onPress={() => handleEditIncome(item)}
        activeOpacity={0.7}
      >
        {/* Header da receita */}
        <View style={styles.incomeHeader}>
          <View style={styles.incomeInfo}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryIcon}>{item.categoryIcon || '💰'}</Text>
              <Text style={styles.categoryName}>{item.categoryName || 'Sem categoria'}</Text>
            </View>
            <Text style={styles.incomeAmount}>
              + {formatCurrency(item.amount)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.moreButton}
            onPress={() => handleDeleteIncome(item)}
          >
            <MaterialCommunityIcons
              name="delete-outline"
              size={20}
              color={NUBANK_COLORS.ERROR}
            />
          </TouchableOpacity>
        </View>

        {/* Descrição */}
        <Text style={styles.incomeDescription}>{item.description}</Text>

        {/* Footer da receita */}
        <View style={styles.incomeFooter}>
          <View style={styles.footerLeft}>
            <Text style={styles.incomeDate}>{formatDate(item.date)}</Text>
            {item.establishmentName && (
              <View style={styles.establishmentTag}>
                <MaterialCommunityIcons
                  name="store-outline"
                  size={12}
                  color={NUBANK_COLORS.TEXT_SECONDARY}
                />
                <Text style={styles.establishmentName}>{item.establishmentName}</Text>
              </View>
            )}
          </View>
          {item.paymentMethodIcon && (
            <View style={styles.paymentMethodTag}>
              <Text style={styles.paymentMethodIcon}>{item.paymentMethodIcon}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );

  const getTotalAmount = () => {
    const filtered = getFilteredIncomes();
    return (filtered || []).reduce((sum, income) => sum + (income.amount || 0), 0);
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor={NUBANK_COLORS.PRIMARY} />
        
        {/* Header */}
        <LinearGradient
          colors={NUBANK_COLORS.GRADIENT_PRIMARY}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Receitas</Text>
        </LinearGradient>

        {/* Loading skeleton */}
        <View style={styles.content}>
          <ActivityIndicator size="large" color={NUBANK_COLORS.PRIMARY} />
        </View>
      </View>
    );
  }

  const filteredIncomes = getFilteredIncomes();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={NUBANK_COLORS.PRIMARY} />
      
      {/* Header */}
      <LinearGradient
        colors={NUBANK_COLORS.GRADIENT_PRIMARY}
        style={styles.header}
      >
        <Animated.View
          style={[
            styles.headerContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.headerTitle}>Receitas</Text>
          <View style={styles.headerStats}>
            <Text style={styles.headerStatsLabel}>Total do período</Text>
            <Text style={styles.headerStatsAmount}>
              + {formatCurrency(getTotalAmount())}
            </Text>
          </View>
        </Animated.View>
      </LinearGradient>

      {/* Barra de busca e filtros */}
      <FadeInView delay={200} style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar receitas..."
          style={styles.searchBar}
        />
        
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <MaterialCommunityIcons
            name="filter-variant"
            size={24}
            color={NUBANK_COLORS.PRIMARY}
          />
        </TouchableOpacity>
      </FadeInView>

      {/* Filtros */}
      {showFilters && (
        <SlideInView style={styles.filtersContainer}>
          <Text style={styles.filtersTitle}>Filtros</Text>
          
          {/* Período */}
          <ChipGroup
            label="Período"
            data={[
              { id: 'today', label: 'Hoje' },
              { id: 'week', label: 'Última semana' },
              { id: 'month', label: 'Último mês' },
              { id: 'year', label: 'Último ano' },
              { id: 'all', label: 'Todos' },
            ]}
            selectedId={selectedPeriod}
            onSelect={setSelectedPeriod}
          />

          {/* Categorias */}
          <ChipGroup
            label="Categoria"
            data={[
              { id: null, label: 'Todas' },
              ...(categories || []).map(cat => ({
                id: cat.id,
                label: `${cat.icon} ${cat.name}`,
              })),
            ]}
            selectedId={selectedCategory}
            onSelect={setSelectedCategory}
          />
        </SlideInView>
      )}

      {/* Lista de receitas */}
      <FadeInView delay={400} style={styles.content}>
        {filteredIncomes.length === 0 ? (
          <EmptyState
            icon="cash-plus"
            title="Nenhuma receita encontrada"
            description={
              searchQuery || selectedCategory
                ? 'Tente ajustar os filtros de busca'
                : 'Que tal adicionar sua primeira receita?'
            }
            actionLabel={!searchQuery && !selectedCategory ? 'Adicionar Receita' : undefined}
            onActionPress={!searchQuery && !selectedCategory ? handleAddIncome : undefined}
          />
        ) : (
          <FlatList
            data={filteredIncomes}
            renderItem={renderIncomeItem}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[NUBANK_COLORS.PRIMARY]}
                tintColor={NUBANK_COLORS.PRIMARY}
              />
            }
          />
        )}
      </FadeInView>

      {/* Botão flutuante */}
      <FloatingActionButton
        icon="plus"
        onPress={handleAddIncome}
        style={styles.fab}
      />

      {/* Modal de formulário */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <IncomeForm
          income={editingIncome}
          categories={categories || []}
          paymentMethods={paymentMethods || []}
          establishments={establishments || []}
          onSave={async () => {
            setShowModal(false);
            await loadIncomes();
            
            // Notificar outros componentes
            if (global.incomeListeners) {
              global.incomeListeners.forEach(listener => {
                if (typeof listener === 'function') {
                  listener();
                }
              });
            }
          }}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NUBANK_COLORS.BACKGROUND,
  },
  header: {
    paddingHorizontal: NUBANK_SPACING.LG,
    paddingBottom: NUBANK_SPACING.LG,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: NUBANK_FONT_SIZES.XL,
    fontWeight: NUBANK_FONT_WEIGHTS.bold,
    color: NUBANK_COLORS.TEXT_WHITE,
    marginBottom: NUBANK_SPACING.SM,
  },
  headerStats: {
    alignItems: 'center',
  },
  headerStatsLabel: {
    fontSize: NUBANK_FONT_SIZES.SM,
    color: NUBANK_COLORS.TEXT_WHITE,
    opacity: 0.8,
  },
  headerStatsAmount: {
    fontSize: NUBANK_FONT_SIZES.XXL,
    fontWeight: NUBANK_FONT_WEIGHTS.bold,
    color: NUBANK_COLORS.TEXT_WHITE,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: NUBANK_SPACING.LG,
    paddingTop: NUBANK_SPACING.MD,
    gap: NUBANK_SPACING.SM,
  },
  searchBar: {
    flex: 1,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: NUBANK_BORDER_RADIUS.md,
    backgroundColor: NUBANK_COLORS.BACKGROUND,
    justifyContent: 'center',
    alignItems: 'center',
    ...NUBANK_SHADOWS.small,
  },
  filtersContainer: {
    backgroundColor: NUBANK_COLORS.BACKGROUND,
    marginHorizontal: NUBANK_SPACING.LG,
    marginTop: NUBANK_SPACING.MD,
    padding: NUBANK_SPACING.LG,
    borderRadius: NUBANK_BORDER_RADIUS.lg,
    ...NUBANK_SHADOWS.medium,
  },
  filtersTitle: {
    fontSize: NUBANK_FONT_SIZES.MD,
    fontWeight: NUBANK_FONT_WEIGHTS.semibold,
    color: NUBANK_COLORS.TEXT_PRIMARY,
    marginBottom: NUBANK_SPACING.MD,
  },
  content: {
    flex: 1,
    paddingTop: NUBANK_SPACING.MD,
  },
  listContainer: {
    paddingHorizontal: NUBANK_SPACING.LG,
    paddingBottom: 100,
  },
  incomeCard: {
    backgroundColor: NUBANK_COLORS.CARD_BACKGROUND,
    borderRadius: NUBANK_BORDER_RADIUS.lg,
    marginBottom: NUBANK_SPACING.MD,
    overflow: 'hidden',
  },
  incomeContent: {
    padding: NUBANK_SPACING.LG,
  },
  incomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: NUBANK_SPACING.SM,
  },
  incomeInfo: {
    flex: 1,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: NUBANK_SPACING.XS,
  },
  categoryIcon: {
    fontSize: NUBANK_FONT_SIZES.SM,
    marginRight: NUBANK_SPACING.XS,
  },
  categoryName: {
    fontSize: NUBANK_FONT_SIZES.SM,
    color: NUBANK_COLORS.TEXT_SECONDARY,
    fontWeight: NUBANK_FONT_WEIGHTS.medium,
  },
  incomeAmount: {
    fontSize: NUBANK_FONT_SIZES.LG,
    fontWeight: NUBANK_FONT_WEIGHTS.bold,
    color: NUBANK_COLORS.SUCCESS,
  },
  moreButton: {
    padding: NUBANK_SPACING.XS,
  },
  incomeDescription: {
    fontSize: NUBANK_FONT_SIZES.MD,
    color: NUBANK_COLORS.TEXT_PRIMARY,
    fontWeight: NUBANK_FONT_WEIGHTS.medium,
    marginBottom: NUBANK_SPACING.SM,
  },
  incomeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    flex: 1,
  },
  incomeDate: {
    fontSize: NUBANK_FONT_SIZES.SM,
    color: NUBANK_COLORS.TEXT_SECONDARY,
    marginBottom: NUBANK_SPACING.XS,
  },
  establishmentTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  establishmentName: {
    fontSize: NUBANK_FONT_SIZES.XS,
    color: NUBANK_COLORS.TEXT_SECONDARY,
    marginLeft: NUBANK_SPACING.XS,
  },
  paymentMethodTag: {
    backgroundColor: NUBANK_COLORS.BACKGROUND_SECONDARY,
    paddingHorizontal: NUBANK_SPACING.SM,
    paddingVertical: NUBANK_SPACING.XS,
    borderRadius: NUBANK_BORDER_RADIUS.sm,
  },
  paymentMethodIcon: {
    fontSize: NUBANK_FONT_SIZES.SM,
  },
  fab: {
    position: 'absolute',
    bottom: NUBANK_SPACING.XL,
    right: NUBANK_SPACING.LG,
  },
});