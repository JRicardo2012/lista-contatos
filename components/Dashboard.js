// components/Dashboard.js - DESIGN NUBANK
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Platform
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { formatCurrency, formatDate } from '../utils/helpers';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { useAuth } from '../services/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import {
  NUBANK_COLORS,
  NUBANK_SPACING,
  NUBANK_FONT_SIZES,
  NUBANK_BORDER_RADIUS,
  NUBANK_SHADOWS,
  NUBANK_FONT_WEIGHTS
} from '../constants/nubank-theme';

const { width: screenWidth } = Dimensions.get('window');

// Listeners globais para atualização automática
global.expenseListeners = global.expenseListeners || [];
global.incomeListeners = global.incomeListeners || [];

export default function Dashboard({ navigation }) {
  const db = useSQLiteContext();
  const { user } = useAuth();

  // Estados principais
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [showBalance, setShowBalance] = useState(true);

  // Dados de despesas
  const [todayTotal, setTodayTotal] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [weekTotal, setWeekTotal] = useState(0);
  const [monthTotal, setMonthTotal] = useState(0);
  const [lastMonthTotal, setLastMonthTotal] = useState(0);
  const [yearTotal, setYearTotal] = useState(0);

  // Dados de receitas
  const [todayIncomeTotal, setTodayIncomeTotal] = useState(0);
  const [todayIncomeCount, setTodayIncomeCount] = useState(0);
  const [weekIncomeTotal, setWeekIncomeTotal] = useState(0);
  const [monthIncomeTotal, setMonthIncomeTotal] = useState(0);
  const [lastMonthIncomeTotal, setLastMonthIncomeTotal] = useState(0);
  const [yearIncomeTotal, setYearIncomeTotal] = useState(0);
  const [categoryData, setCategoryData] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [topEstablishments, setTopEstablishments] = useState([]);

  // Estados de insights
  const [insights, setInsights] = useState([]);
  const [daysWithoutExpenses, setDaysWithoutExpenses] = useState(0);
  const [anomalies, setAnomalies] = useState([]);

  // Animações
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];
  const scaleAnim = useState(new Animated.Value(0.8))[0];

  // Registra listeners para atualizações automáticas
  useEffect(() => {
    const expenseListener = () => {
      console.log('📡 Dashboard notificado sobre mudança nas despesas');
      loadAllData();
    };

    const incomeListener = () => {
      console.log('📡 Dashboard notificado sobre mudança nas receitas');
      loadAllData();
    };

    global.expenseListeners.push(expenseListener);
    global.incomeListeners.push(incomeListener);

    return () => {
      const expenseIndex = global.expenseListeners.indexOf(expenseListener);
      if (expenseIndex > -1) {
        global.expenseListeners.splice(expenseIndex, 1);
      }
      
      const incomeIndex = global.incomeListeners.indexOf(incomeListener);
      if (incomeIndex > -1) {
        global.incomeListeners.splice(incomeIndex, 1);
      }
    };
  }, []);

  // Carrega dados na montagem
  useEffect(() => {
    loadAllData();
    startAnimations();
  }, [db, user]);

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true
      })
    ]).start();
  };

  // Funções de dados (mantidas as mesmas)
  const getTodayData = async () => {
    const result = await db.getFirstAsync(
      `
      SELECT 
        COALESCE(SUM(CAST(amount AS REAL)), 0) as total,
        COUNT(*) as count
      FROM expenses 
      WHERE DATE(date) = DATE('now', 'localtime')
      AND user_id = ?
    `,
      [user.id]
    );

    return result || { total: 0, count: 0 };
  };

  const getWeekData = async () => {
    const result = await db.getFirstAsync(
      `
      SELECT COALESCE(SUM(CAST(amount AS REAL)), 0) as total
      FROM expenses 
      WHERE DATE(date) >= DATE('now', '-7 days', 'localtime')
      AND user_id = ?
    `,
      [user.id]
    );

    return result?.total || 0;
  };

  const getMonthData = async () => {
    const result = await db.getFirstAsync(
      `
      SELECT COALESCE(SUM(CAST(amount AS REAL)), 0) as total
      FROM expenses 
      WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now', 'localtime')
      AND user_id = ?
    `,
      [user.id]
    );

    return result?.total || 0;
  };

  const getLastMonthData = async () => {
    const result = await db.getFirstAsync(
      `
      SELECT COALESCE(SUM(CAST(amount AS REAL)), 0) as total
      FROM expenses 
      WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now', '-1 month', 'localtime')
      AND user_id = ?
    `,
      [user.id]
    );

    return result?.total || 0;
  };

  const getYearData = async () => {
    const result = await db.getFirstAsync(
      `
      SELECT COALESCE(SUM(CAST(amount AS REAL)), 0) as total
      FROM expenses 
      WHERE strftime('%Y', date) = strftime('%Y', 'now', 'localtime')
      AND user_id = ?
    `,
      [user.id]
    );

    return result?.total || 0;
  };

  const getCategoryData = async () => {
    const results = await db.getAllAsync(
      `
      SELECT 
        c.name,
        c.icon,
        COALESCE(SUM(CAST(e.amount AS REAL)), 0) as total,
        COUNT(e.id) as count
      FROM categories c
      LEFT JOIN expenses e ON c.id = e.categoryId 
        AND e.user_id = ?
        AND DATE(e.date) >= DATE('now', '-30 days', 'localtime')
      GROUP BY c.id, c.name, c.icon
      HAVING total > 0
      ORDER BY total DESC
    `,
      [user.id]
    );

    return results || [];
  };

  const getWeeklyData = async () => {
    const results = await db.getAllAsync(
      `
      SELECT 
        DATE(date) as day,
        strftime('%w', date) as weekday,
        SUM(CAST(amount AS REAL)) as total,
        COUNT(*) as count
      FROM expenses
      WHERE DATE(date) >= DATE('now', '-7 days', 'localtime')
      AND user_id = ?
      GROUP BY DATE(date)
      ORDER BY DATE(date) ASC
    `,
      [user.id]
    );

    const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const last7Days = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayData = results.find(r => r.day === dateStr);
      last7Days.push({
        day: daysOfWeek[date.getDay()],
        date: dateStr,
        total: dayData ? dayData.total : 0,
        count: dayData ? dayData.count : 0
      });
    }

    return last7Days;
  };

  const getRecentExpenses = async () => {
    const results = await db.getAllAsync(
      `
      SELECT 
        e.*,
        c.name as categoryName,
        c.icon as categoryIcon,
        est.name as establishmentName,
        pm.name as paymentMethodName,
        pm.icon as paymentMethodIcon
      FROM expenses e
      LEFT JOIN categories c ON e.categoryId = c.id
      LEFT JOIN establishments est ON e.establishment_id = est.id
      LEFT JOIN payment_methods pm ON e.payment_method_id = pm.id
      WHERE e.user_id = ?
      ORDER BY e.date DESC, e.id DESC
      LIMIT 5
    `,
      [user.id]
    );

    return results || [];
  };

  const getMonthlyTrend = async () => {
    const results = await db.getAllAsync(
      `
      SELECT 
        strftime('%Y-%m', date) as month,
        SUM(CAST(amount AS REAL)) as total
      FROM expenses
      WHERE date >= date('now', '-6 months')
      AND user_id = ?
      GROUP BY strftime('%Y-%m', date)
      ORDER BY month ASC
    `,
      [user.id]
    );

    const months = [
      'Jan',
      'Fev',
      'Mar',
      'Abr',
      'Mai',
      'Jun',
      'Jul',
      'Ago',
      'Set',
      'Out',
      'Nov',
      'Dez'
    ];

    return results.map(r => {
      const [year, month] = r.month.split('-');
      return {
        month: months[parseInt(month) - 1],
        total: r.total
      };
    });
  };

  const getTopEstablishments = async () => {
    const results = await db.getAllAsync(
      `
      SELECT 
        est.name,
        COUNT(e.id) as visit_count,
        SUM(CAST(e.amount AS REAL)) as total_spent
      FROM expenses e
      INNER JOIN establishments est ON e.establishment_id = est.id
      WHERE e.user_id = ?
      AND DATE(e.date) >= DATE('now', '-30 days', 'localtime')
      GROUP BY est.id, est.name
      ORDER BY visit_count DESC, total_spent DESC
      LIMIT 3
    `,
      [user.id]
    );

    return results || [];
  };

  // Funções de dados de receitas
  const getTodayIncomeData = async () => {
    const result = await db.getFirstAsync(
      `
      SELECT 
        COALESCE(SUM(CAST(amount AS REAL)), 0) as total,
        COUNT(*) as count
      FROM incomes 
      WHERE DATE(date) = DATE('now', 'localtime')
      AND user_id = ?
    `,
      [user.id]
    );
    return result || { total: 0, count: 0 };
  };

  const getWeekIncomeData = async () => {
    const result = await db.getFirstAsync(
      `
      SELECT COALESCE(SUM(CAST(amount AS REAL)), 0) as total
      FROM incomes 
      WHERE DATE(date) >= DATE('now', '-7 days', 'localtime')
      AND user_id = ?
    `,
      [user.id]
    );
    return result?.total || 0;
  };

  const getMonthIncomeData = async () => {
    const result = await db.getFirstAsync(
      `
      SELECT COALESCE(SUM(CAST(amount AS REAL)), 0) as total
      FROM incomes 
      WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now', 'localtime')
      AND user_id = ?
    `,
      [user.id]
    );
    return result?.total || 0;
  };

  const getLastMonthIncomeData = async () => {
    const result = await db.getFirstAsync(
      `
      SELECT COALESCE(SUM(CAST(amount AS REAL)), 0) as total
      FROM incomes 
      WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now', '-1 month', 'localtime')
      AND user_id = ?
    `,
      [user.id]
    );
    return result?.total || 0;
  };

  const getYearIncomeData = async () => {
    const result = await db.getFirstAsync(
      `
      SELECT COALESCE(SUM(CAST(amount AS REAL)), 0) as total
      FROM incomes 
      WHERE strftime('%Y', date) = strftime('%Y', 'now', 'localtime')
      AND user_id = ?
    `,
      [user.id]
    );
    return result?.total || 0;
  };

  const loadAllData = useCallback(async () => {
    if (!db || !user) return;

    try {
      setLoading(true);

      const [
        todayData,
        week,
        month,
        lastMonth,
        year,
        categories,
        weekly,
        recent,
        monthly,
        establishments,
        todayIncomeData,
        weekIncome,
        monthIncome,
        lastMonthIncome,
        yearIncome
      ] = await Promise.all([
        getTodayData(),
        getWeekData(),
        getMonthData(),
        getLastMonthData(),
        getYearData(),
        getCategoryData(),
        getWeeklyData(),
        getRecentExpenses(),
        getMonthlyTrend(),
        getTopEstablishments(),
        getTodayIncomeData(),
        getWeekIncomeData(),
        getMonthIncomeData(),
        getLastMonthIncomeData(),
        getYearIncomeData()
      ]);

      setTodayTotal(todayData.total);
      setTodayCount(todayData.count);
      setWeekTotal(week);
      setMonthTotal(month);
      setLastMonthTotal(lastMonth);
      setYearTotal(year);
      setCategoryData(categories);
      setWeeklyData(weekly);
      setRecentExpenses(recent);
      setMonthlyTrend(monthly);
      setTopEstablishments(establishments);

      // Dados de receitas
      setTodayIncomeTotal(todayIncomeData.total);
      setTodayIncomeCount(todayIncomeData.count);
      setWeekIncomeTotal(weekIncome);
      setMonthIncomeTotal(monthIncome);
      setLastMonthIncomeTotal(lastMonthIncome);
      setYearIncomeTotal(yearIncome);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [db, user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAllData();
  }, [loadAllData]);

  // Prepara dados para gráficos
  const pieChartData = useMemo(() => {
    if (categoryData.length === 0) return [];

    const colors = [
      NUBANK_COLORS.PRIMARY,
      NUBANK_COLORS.PRIMARY_DARK,
      NUBANK_COLORS.PRIMARY_LIGHT,
      '#A640FF',
      '#9B30FF',
      '#8820FF'
    ];

    return categoryData.slice(0, 5).map((cat, index) => ({
      name: cat.name,
      population: cat.total,
      color: colors[index % colors.length],
      legendFontColor: NUBANK_COLORS.TEXT_PRIMARY,
      legendFontSize: 12
    }));
  }, [categoryData]);

  const lineChartData = useMemo(() => {
    if (weeklyData.length === 0) return null;

    return {
      labels: weeklyData.map(d => d.day),
      datasets: [
        {
          data: weeklyData.map(d => d.total),
          strokeWidth: 3
        }
      ]
    };
  }, [weeklyData]);

  const chartConfig = {
    backgroundColor: NUBANK_COLORS.BACKGROUND,
    backgroundGradientFrom: NUBANK_COLORS.BACKGROUND,
    backgroundGradientTo: NUBANK_COLORS.BACKGROUND,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(130, 10, 209, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(17, 17, 17, ${opacity})`,
    style: {
      borderRadius: NUBANK_BORDER_RADIUS.LG
    }
  };

  // Renderização condicional durante carregamento
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color={NUBANK_COLORS.PRIMARY} />
        <Text style={styles.loadingText}>Carregando dashboard...</Text>
      </View>
    );
  }

  // Renderização do valor com máscara
  const renderMaskedValue = value => {
    if (showBalance) {
      return formatCurrency(value);
    }
    return '••••••';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle='light-content' backgroundColor={NUBANK_COLORS.PRIMARY} />

      {/* Header Nubank */}
      <LinearGradient
        colors={[NUBANK_COLORS.PRIMARY, NUBANK_COLORS.PRIMARY_DARK]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.menuButton} onPress={() => navigation.openDrawer()}>
            <Ionicons name='menu' size={24} color={NUBANK_COLORS.TEXT_WHITE} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.eyeButton} onPress={() => setShowBalance(!showBalance)}>
            <Ionicons
              name={showBalance ? 'eye-outline' : 'eye-off-outline'}
              size={24}
              color={NUBANK_COLORS.TEXT_WHITE}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.greeting}>Olá, {user?.name?.split(' ')[0] || 'Usuário'}</Text>

          <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>Gastos do mês</Text>
            <Text style={styles.balanceValue}>{renderMaskedValue(monthTotal)}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[NUBANK_COLORS.PRIMARY]}
            tintColor={NUBANK_COLORS.PRIMARY}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }}
        >
          {/* Quick Actions - Estilo Nubank */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('Despesas')}
            >
              <View style={styles.quickActionIcon}>
                <MaterialCommunityIcons name='minus' size={24} color={NUBANK_COLORS.ERROR} />
              </View>
              <Text style={styles.quickActionText}>Despesa</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('Receitas')}
            >
              <View style={styles.quickActionIcon}>
                <MaterialCommunityIcons name='plus' size={24} color={NUBANK_COLORS.SUCCESS} />
              </View>
              <Text style={styles.quickActionText}>Receita</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('Resumo Mensal')}
            >
              <View style={styles.quickActionIcon}>
                <MaterialCommunityIcons name='chart-line' size={24} color={NUBANK_COLORS.PRIMARY} />
              </View>
              <Text style={styles.quickActionText}>Relatórios</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('Categorias')}
            >
              <View style={styles.quickActionIcon}>
                <MaterialCommunityIcons
                  name='tag-outline'
                  size={24}
                  color={NUBANK_COLORS.PRIMARY}
                />
              </View>
              <Text style={styles.quickActionText}>Categorias</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('Estabelecimentos')}
            >
              <View style={styles.quickActionIcon}>
                <MaterialCommunityIcons
                  name='store-outline'
                  size={24}
                  color={NUBANK_COLORS.PRIMARY}
                />
              </View>
              <Text style={styles.quickActionText}>Locais</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Cards de resumo - Estilo Nubank */}
          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>Resumo</Text>

            <View style={styles.summaryCards}>
              <TouchableOpacity style={styles.summaryCard}>
                <View style={styles.summaryCardContent}>
                  <Text style={styles.summaryCardLabel}>Hoje</Text>
                  <Text style={styles.summaryCardValue}>{renderMaskedValue(todayTotal)}</Text>
                  <Text style={styles.summaryCardSubtext}>
                    {todayCount} {todayCount === 1 ? 'despesa' : 'despesas'}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.summaryCard}>
                <View style={styles.summaryCardContent}>
                  <Text style={styles.summaryCardLabel}>Semana</Text>
                  <Text style={styles.summaryCardValue}>{renderMaskedValue(weekTotal)}</Text>
                  <Text style={styles.summaryCardSubtext}>Últimos 7 dias</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.summaryCard}>
                <View style={styles.summaryCardContent}>
                  <Text style={styles.summaryCardLabel}>Mês anterior</Text>
                  <Text style={styles.summaryCardValue}>{renderMaskedValue(lastMonthTotal)}</Text>
                  <Text style={styles.summaryCardSubtext}>
                    {lastMonthTotal > monthTotal ? '📈' : '📉'}{' '}
                    {Math.abs(
                      ((monthTotal - lastMonthTotal) / (lastMonthTotal || 1)) * 100
                    ).toFixed(0)}
                    %
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.summaryCard}>
                <View style={styles.summaryCardContent}>
                  <Text style={styles.summaryCardLabel}>Ano</Text>
                  <Text style={styles.summaryCardValue}>{renderMaskedValue(yearTotal)}</Text>
                  <Text style={styles.summaryCardSubtext}>{new Date().getFullYear()}</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Seção de Receitas - Estilo Nubank */}
          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>Receitas</Text>

            <View style={styles.summaryCards}>
              <TouchableOpacity style={styles.summaryCard}>
                <View style={[styles.summaryCardContent, { backgroundColor: '#E8F8F5' }]}>
                  <Text style={styles.summaryCardLabel}>Hoje</Text>
                  <Text style={[styles.summaryCardValue, { color: NUBANK_COLORS.SUCCESS }]}>
                    + {renderMaskedValue(todayIncomeTotal)}
                  </Text>
                  <Text style={styles.summaryCardSubtext}>
                    {todayIncomeCount} {todayIncomeCount === 1 ? 'receita' : 'receitas'}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.summaryCard}>
                <View style={[styles.summaryCardContent, { backgroundColor: '#E8F8F5' }]}>
                  <Text style={styles.summaryCardLabel}>Semana</Text>
                  <Text style={[styles.summaryCardValue, { color: NUBANK_COLORS.SUCCESS }]}>
                    + {renderMaskedValue(weekIncomeTotal)}
                  </Text>
                  <Text style={styles.summaryCardSubtext}>Últimos 7 dias</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.summaryCard}>
                <View style={[styles.summaryCardContent, { backgroundColor: '#E8F8F5' }]}>
                  <Text style={styles.summaryCardLabel}>Mês</Text>
                  <Text style={[styles.summaryCardValue, { color: NUBANK_COLORS.SUCCESS }]}>
                    + {renderMaskedValue(monthIncomeTotal)}
                  </Text>
                  <Text style={styles.summaryCardSubtext}>
                    {monthIncomeTotal > lastMonthIncomeTotal ? '📈' : '📉'}{' '}
                    {Math.abs(
                      ((monthIncomeTotal - lastMonthIncomeTotal) / (lastMonthIncomeTotal || 1)) * 100
                    ).toFixed(0)}
                    %
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.summaryCard}>
                <View style={[styles.summaryCardContent, { backgroundColor: '#E8F8F5' }]}>
                  <Text style={styles.summaryCardLabel}>Ano</Text>
                  <Text style={[styles.summaryCardValue, { color: NUBANK_COLORS.SUCCESS }]}>
                    + {renderMaskedValue(yearIncomeTotal)}
                  </Text>
                  <Text style={styles.summaryCardSubtext}>{new Date().getFullYear()}</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Card de saldo */}
            <TouchableOpacity style={[styles.summaryCard, { width: '100%', paddingHorizontal: NUBANK_SPACING.SM }]}>
              <View style={[styles.summaryCardContent, { backgroundColor: NUBANK_COLORS.PRIMARY, padding: NUBANK_SPACING.LG }]}>
                <Text style={[styles.summaryCardLabel, { color: NUBANK_COLORS.TEXT_WHITE }]}>
                  Saldo do Mês
                </Text>
                <Text style={[styles.summaryCardValue, { color: NUBANK_COLORS.TEXT_WHITE, fontSize: NUBANK_FONT_SIZES.XXL }]}>
                  {renderMaskedValue(monthIncomeTotal - monthTotal)}
                </Text>
                <Text style={[styles.summaryCardSubtext, { color: NUBANK_COLORS.TEXT_WHITE, opacity: 0.8 }]}>
                  Receitas - Despesas
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Gráfico de evolução - Estilo Nubank */}
          {lineChartData && (
            <View style={styles.chartSection}>
              <Text style={styles.sectionTitle}>Evolução semanal</Text>
              <View style={styles.chartContainer}>
                <LineChart
                  data={lineChartData}
                  width={screenWidth - NUBANK_SPACING.LG * 2}
                  height={220}
                  chartConfig={chartConfig}
                  bezier
                  style={styles.chart}
                  withInnerLines={false}
                  withOuterLines={false}
                  withVerticalLabels={true}
                  withHorizontalLabels={true}
                  segments={4}
                />
              </View>
            </View>
          )}

          {/* Gastos por categoria - Estilo Nubank */}
          {categoryData.length > 0 && (
            <View style={styles.categorySection}>
              <Text style={styles.sectionTitle}>Por categoria</Text>
              {categoryData.slice(0, 5).map((category, index) => {
                const percentage = (category.total / monthTotal) * 100;
                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.categoryCard}
                    onPress={() => navigation.navigate('Despesas')}
                  >
                    <View style={styles.categoryLeft}>
                      <Text style={styles.categoryIcon}>{category.icon}</Text>
                      <View style={styles.categoryInfo}>
                        <Text style={styles.categoryName}>{category.name}</Text>
                        <Text style={styles.categoryCount}>
                          {category.count} {category.count === 1 ? 'despesa' : 'despesas'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.categoryRight}>
                      <Text style={styles.categoryValue}>{formatCurrency(category.total)}</Text>
                      <Text style={styles.categoryPercentage}>{percentage.toFixed(0)}%</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Despesas recentes - Estilo Nubank */}
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <Text style={styles.sectionTitle}>Últimas transações</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Despesas')}>
                <Text style={styles.seeAllButton}>Ver todas</Text>
              </TouchableOpacity>
            </View>

            {recentExpenses.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name='receipt-text'
                  size={48}
                  color={NUBANK_COLORS.TEXT_TERTIARY}
                />
                <Text style={styles.emptyText}>Nenhuma despesa registrada</Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => navigation.navigate('Despesas')}
                >
                  <Text style={styles.addButtonText}>Adicionar despesa</Text>
                </TouchableOpacity>
              </View>
            ) : (
              recentExpenses.map(expense => (
                <TouchableOpacity
                  key={expense.id}
                  style={styles.transactionCard}
                  onPress={() => navigation.navigate('Despesas')}
                >
                  <View style={styles.transactionLeft}>
                    <View style={styles.transactionIcon}>
                      <Text>{expense.categoryIcon || '💰'}</Text>
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionDescription}>{expense.description}</Text>
                      <Text style={styles.transactionDetails}>
                        {expense.categoryName || 'Sem categoria'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.transactionRight}>
                    <Text style={styles.transactionValue}>{formatCurrency(expense.amount)}</Text>
                    <Text style={styles.transactionDate}>{formatDate(expense.date)}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </Animated.View>
      </ScrollView>

      {/* FAB - Estilo Nubank */}
      <Animated.View
        style={[
          styles.fab,
          {
            opacity: scaleAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <TouchableOpacity
          style={styles.fabButton}
          onPress={() => navigation.navigate('Despesas')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name='plus' size={28} color={NUBANK_COLORS.TEXT_WHITE} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NUBANK_COLORS.BACKGROUND
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: NUBANK_COLORS.BACKGROUND
  },
  loadingText: {
    marginTop: NUBANK_SPACING.MD,
    fontSize: NUBANK_FONT_SIZES.MD,
    color: NUBANK_COLORS.TEXT_SECONDARY
  },

  // Header Nubank
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: NUBANK_SPACING.LG,
    paddingBottom: NUBANK_SPACING.XL
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: NUBANK_SPACING.LG
  },
  menuButton: {
    padding: NUBANK_SPACING.SM
  },
  eyeButton: {
    padding: NUBANK_SPACING.SM
  },
  headerContent: {
    marginTop: NUBANK_SPACING.SM
  },
  greeting: {
    fontSize: NUBANK_FONT_SIZES.LG,
    color: NUBANK_COLORS.TEXT_WHITE,
    fontWeight: NUBANK_FONT_WEIGHTS.REGULAR,
    marginBottom: NUBANK_SPACING.LG
  },
  balanceContainer: {
    marginTop: NUBANK_SPACING.SM
  },
  balanceLabel: {
    fontSize: NUBANK_FONT_SIZES.SM,
    color: NUBANK_COLORS.TEXT_WHITE,
    opacity: 0.8,
    marginBottom: NUBANK_SPACING.XS
  },
  balanceValue: {
    fontSize: NUBANK_FONT_SIZES.XXXL,
    color: NUBANK_COLORS.TEXT_WHITE,
    fontWeight: NUBANK_FONT_WEIGHTS.BOLD
  },

  // ScrollView
  scrollView: {
    flex: 1
  },

  // Quick Actions
  quickActions: {
    paddingVertical: NUBANK_SPACING.LG,
    paddingLeft: NUBANK_SPACING.LG
  },
  quickActionCard: {
    alignItems: 'center',
    marginRight: NUBANK_SPACING.LG
  },
  quickActionIcon: {
    width: 60,
    height: 60,
    borderRadius: NUBANK_BORDER_RADIUS.ROUND,
    backgroundColor: NUBANK_COLORS.BACKGROUND_SECONDARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: NUBANK_SPACING.SM
  },
  quickActionText: {
    fontSize: NUBANK_FONT_SIZES.SM,
    color: NUBANK_COLORS.TEXT_PRIMARY,
    fontWeight: NUBANK_FONT_WEIGHTS.MEDIUM
  },

  // Summary Section
  summarySection: {
    paddingHorizontal: NUBANK_SPACING.LG,
    marginTop: NUBANK_SPACING.MD
  },
  sectionTitle: {
    fontSize: NUBANK_FONT_SIZES.XL,
    fontWeight: NUBANK_FONT_WEIGHTS.BOLD,
    color: NUBANK_COLORS.TEXT_PRIMARY,
    marginBottom: NUBANK_SPACING.MD
  },
  summaryCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -NUBANK_SPACING.SM
  },
  summaryCard: {
    width: '50%',
    padding: NUBANK_SPACING.SM
  },
  summaryCardContent: {
    backgroundColor: NUBANK_COLORS.BACKGROUND_SECONDARY,
    borderRadius: NUBANK_BORDER_RADIUS.LG,
    padding: NUBANK_SPACING.MD,
    minHeight: 100
  },
  summaryCardLabel: {
    fontSize: NUBANK_FONT_SIZES.SM,
    color: NUBANK_COLORS.TEXT_SECONDARY,
    marginBottom: NUBANK_SPACING.XS
  },
  summaryCardValue: {
    fontSize: NUBANK_FONT_SIZES.XL,
    fontWeight: NUBANK_FONT_WEIGHTS.BOLD,
    color: NUBANK_COLORS.TEXT_PRIMARY,
    marginBottom: NUBANK_SPACING.XS
  },
  summaryCardSubtext: {
    fontSize: NUBANK_FONT_SIZES.XS,
    color: NUBANK_COLORS.TEXT_TERTIARY
  },

  // Chart Section
  chartSection: {
    marginTop: NUBANK_SPACING.XL,
    paddingHorizontal: NUBANK_SPACING.LG
  },
  chartContainer: {
    backgroundColor: NUBANK_COLORS.BACKGROUND_SECONDARY,
    borderRadius: NUBANK_BORDER_RADIUS.LG,
    padding: NUBANK_SPACING.MD,
    alignItems: 'center'
  },
  chart: {
    borderRadius: NUBANK_BORDER_RADIUS.LG
  },

  // Category Section
  categorySection: {
    marginTop: NUBANK_SPACING.XL,
    paddingHorizontal: NUBANK_SPACING.LG
  },
  categoryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: NUBANK_COLORS.BACKGROUND_SECONDARY,
    borderRadius: NUBANK_BORDER_RADIUS.LG,
    padding: NUBANK_SPACING.MD,
    marginBottom: NUBANK_SPACING.SM
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: NUBANK_SPACING.MD
  },
  categoryInfo: {
    flex: 1
  },
  categoryName: {
    fontSize: NUBANK_FONT_SIZES.MD,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD,
    color: NUBANK_COLORS.TEXT_PRIMARY
  },
  categoryCount: {
    fontSize: NUBANK_FONT_SIZES.SM,
    color: NUBANK_COLORS.TEXT_SECONDARY
  },
  categoryRight: {
    alignItems: 'flex-end'
  },
  categoryValue: {
    fontSize: NUBANK_FONT_SIZES.MD,
    fontWeight: NUBANK_FONT_WEIGHTS.BOLD,
    color: NUBANK_COLORS.TEXT_PRIMARY
  },
  categoryPercentage: {
    fontSize: NUBANK_FONT_SIZES.SM,
    color: NUBANK_COLORS.PRIMARY,
    fontWeight: NUBANK_FONT_WEIGHTS.MEDIUM
  },

  // Recent Section
  recentSection: {
    marginTop: NUBANK_SPACING.XL,
    paddingHorizontal: NUBANK_SPACING.LG,
    paddingBottom: 100
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: NUBANK_SPACING.MD
  },
  seeAllButton: {
    fontSize: NUBANK_FONT_SIZES.SM,
    color: NUBANK_COLORS.PRIMARY,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD
  },

  // Transaction Card
  transactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: NUBANK_SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: NUBANK_COLORS.BACKGROUND_SECONDARY
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: NUBANK_BORDER_RADIUS.ROUND,
    backgroundColor: NUBANK_COLORS.BACKGROUND_SECONDARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: NUBANK_SPACING.MD
  },
  transactionInfo: {
    flex: 1
  },
  transactionDescription: {
    fontSize: NUBANK_FONT_SIZES.MD,
    fontWeight: NUBANK_FONT_WEIGHTS.MEDIUM,
    color: NUBANK_COLORS.TEXT_PRIMARY
  },
  transactionDetails: {
    fontSize: NUBANK_FONT_SIZES.SM,
    color: NUBANK_COLORS.TEXT_SECONDARY
  },
  transactionRight: {
    alignItems: 'flex-end'
  },
  transactionValue: {
    fontSize: NUBANK_FONT_SIZES.MD,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD,
    color: NUBANK_COLORS.TEXT_PRIMARY
  },
  transactionDate: {
    fontSize: NUBANK_FONT_SIZES.XS,
    color: NUBANK_COLORS.TEXT_TERTIARY
  },

  // Empty State
  emptyState: {
    backgroundColor: NUBANK_COLORS.BACKGROUND_SECONDARY,
    borderRadius: NUBANK_BORDER_RADIUS.LG,
    padding: NUBANK_SPACING.XL,
    alignItems: 'center',
    marginTop: NUBANK_SPACING.MD
  },
  emptyText: {
    fontSize: NUBANK_FONT_SIZES.MD,
    color: NUBANK_COLORS.TEXT_SECONDARY,
    marginVertical: NUBANK_SPACING.MD
  },
  addButton: {
    backgroundColor: NUBANK_COLORS.PRIMARY,
    paddingHorizontal: NUBANK_SPACING.LG,
    paddingVertical: NUBANK_SPACING.MD,
    borderRadius: NUBANK_BORDER_RADIUS.LG
  },
  addButtonText: {
    color: NUBANK_COLORS.TEXT_WHITE,
    fontSize: NUBANK_FONT_SIZES.MD,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: NUBANK_SPACING.LG,
    right: NUBANK_SPACING.LG
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: NUBANK_BORDER_RADIUS.ROUND,
    backgroundColor: NUBANK_COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    ...NUBANK_SHADOWS.LG
  }
});
