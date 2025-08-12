// components/Dashboard.js  
// SUBSTITUIR O ARQUIVO EXISTENTE POR ESTE CÓDIGO COMPLETO

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
import { useAuth } from '../services/AuthContext'; // NOVO IMPORT

const { width: screenWidth } = Dimensions.get('window');

// Listener global para atualização automática
global.expenseListeners = global.expenseListeners || [];

export default function Dashboard({ navigation }) {
  const db = useSQLiteContext();
  const { user } = useAuth(); // NOVO: pega o usuário logado
  
  // Estados principais
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  
  // Dados de despesas
  const [todayTotal, setTodayTotal] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [weekTotal, setWeekTotal] = useState(0);
  const [monthTotal, setMonthTotal] = useState(0);
  const [lastMonthTotal, setLastMonthTotal] = useState(0);
  const [yearTotal, setYearTotal] = useState(0);
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

  // Registra listener para atualizações automáticas
  useEffect(() => {
    const listener = () => {
      console.log('📡 Dashboard notificado sobre mudança nas despesas');
      loadAllData();
    };

    global.expenseListeners.push(listener);

    return () => {
      const index = global.expenseListeners.indexOf(listener);
      if (index > -1) {
        global.expenseListeners.splice(index, 1);
      }
    };
  }, []);

  // Carrega dados na montagem
  useEffect(() => {
    loadAllData();
    startAnimations();
  }, [db, user]); // ATUALIZADO: recarrega quando usuário muda

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      })
    ]).start();
  };

  // ATUALIZADO: Todas as queries agora filtram por user_id
  const getTodayData = async () => {
    const result = await db.getFirstAsync(`
      SELECT 
        COALESCE(SUM(CAST(amount AS REAL)), 0) as total,
        COUNT(*) as count
      FROM expenses 
      WHERE DATE(date) = DATE('now', 'localtime')
      AND user_id = ?
    `, [user.id]);
    
    return result || { total: 0, count: 0 };
  };

  const getWeekData = async () => {
    const result = await db.getFirstAsync(`
      SELECT COALESCE(SUM(CAST(amount AS REAL)), 0) as total
      FROM expenses 
      WHERE DATE(date) >= DATE('now', '-7 days', 'localtime')
      AND user_id = ?
    `, [user.id]);
    
    return result?.total || 0;
  };

  const getMonthData = async () => {
    const result = await db.getFirstAsync(`
      SELECT COALESCE(SUM(CAST(amount AS REAL)), 0) as total
      FROM expenses 
      WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now', 'localtime')
      AND user_id = ?
    `, [user.id]);
    
    return result?.total || 0;
  };

  const getLastMonthData = async () => {
    const result = await db.getFirstAsync(`
      SELECT COALESCE(SUM(CAST(amount AS REAL)), 0) as total
      FROM expenses 
      WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now', '-1 month', 'localtime')
      AND user_id = ?
    `, [user.id]);
    
    return result?.total || 0;
  };

  const getYearData = async () => {
    const result = await db.getFirstAsync(`
      SELECT COALESCE(SUM(CAST(amount AS REAL)), 0) as total
      FROM expenses 
      WHERE strftime('%Y', date) = strftime('%Y', 'now', 'localtime')
      AND user_id = ?
    `, [user.id]);
    
    return result?.total || 0;
  };

  const getCategoryData = async () => {
    const results = await db.getAllAsync(`
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
    `, [user.id]);
    
    return results || [];
  };

  const getWeeklyData = async () => {
    const results = await db.getAllAsync(`
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
    `, [user.id]);
    
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
    const results = await db.getAllAsync(`
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
    `, [user.id]);
    
    return results || [];
  };

  const getMonthlyTrend = async () => {
    const results = await db.getAllAsync(`
      SELECT 
        strftime('%Y-%m', date) as month,
        SUM(CAST(amount AS REAL)) as total
      FROM expenses
      WHERE date >= date('now', '-6 months')
      AND user_id = ?
      GROUP BY strftime('%Y-%m', date)
      ORDER BY month ASC
    `, [user.id]);
    
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    return results.map(r => {
      const [year, month] = r.month.split('-');
      return {
        month: months[parseInt(month) - 1],
        total: r.total
      };
    });
  };

  const getTopEstablishments = async () => {
    const results = await db.getAllAsync(`
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
    `, [user.id]);
    
    return results || [];
  };

  const getDaysWithoutExpenses = async () => {
    const result = await db.getFirstAsync(`
      SELECT 
        julianday('now', 'localtime') - julianday(MAX(date)) as days
      FROM expenses
      WHERE user_id = ?
    `, [user.id]);
    
    return Math.floor(result?.days || 0);
  };

  const detectAnomalies = async () => {
    const avgResult = await db.getFirstAsync(`
      SELECT AVG(daily_total) as avg_daily
      FROM (
        SELECT SUM(CAST(amount AS REAL)) as daily_total
        FROM expenses
        WHERE DATE(date) >= DATE('now', '-30 days', 'localtime')
        AND user_id = ?
        GROUP BY DATE(date)
      )
    `, [user.id]);
    
    const avgDaily = avgResult?.avg_daily || 0;
    const threshold = avgDaily * 1.5;
    
    const anomalousExpenses = await db.getAllAsync(`
      SELECT 
        e.*,
        c.name as categoryName,
        c.icon as categoryIcon
      FROM expenses e
      LEFT JOIN categories c ON e.categoryId = c.id
      WHERE e.amount > ?
      AND e.user_id = ?
      AND DATE(e.date) >= DATE('now', '-7 days', 'localtime')
      ORDER BY e.amount DESC
      LIMIT 3
    `, [threshold, user.id]);
    
    return anomalousExpenses || [];
  };

  const generateInsights = useCallback(async () => {
    const insights = [];
    
    // Comparação com mês anterior
    if (lastMonthTotal > 0) {
      const percentChange = ((monthTotal - lastMonthTotal) / lastMonthTotal) * 100;
      insights.push({
        id: 1,
        type: percentChange > 0 ? 'warning' : 'success',
        title: 'Comparação Mensal',
        message: percentChange > 0 
          ? `Gastos ${percentChange.toFixed(0)}% maiores que mês passado`
          : `Economia de ${Math.abs(percentChange).toFixed(0)}% vs mês passado`,
        priority: 1
      });
    }
    
    // Projeção mensal
    const today = new Date().getDate();
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const projectedMonth = (monthTotal / today) * daysInMonth;
    
    if (projectedMonth > monthTotal * 1.2) {
      insights.push({
        id: 2,
        type: 'warning',
        title: 'Projeção Mensal',
        message: `Projeção: ${formatCurrency(projectedMonth)} até fim do mês`,
        priority: 2
      });
    }
    
    // Categoria dominante
    if (categoryData.length > 0) {
      const topCategory = categoryData[0];
      const percentage = (topCategory.total / monthTotal) * 100;
      
      if (percentage > 40) {
        insights.push({
          id: 3,
          type: 'info',
          title: 'Categoria Principal',
          message: `${topCategory.icon} ${topCategory.name} representa ${percentage.toFixed(0)}% dos gastos`,
          priority: 3
        });
      }
    }
    
    // Dias sem gastos
    if (daysWithoutExpenses > 0) {
      const messages = [
        'Ótimo controle! Continue assim 💪',
        'Economia em ação! 🎯',
        'Carteira agradece! 💰',
        'Disciplina financeira! 🏆'
      ];
      
      insights.push({
        id: 4,
        type: 'success',
        title: `${daysWithoutExpenses} ${daysWithoutExpenses === 1 ? 'dia' : 'dias'} sem gastos!`,
        message: messages[Math.floor(Math.random() * messages.length)],
        priority: 4
      });
    }
    
    // Estabelecimentos frequentes
    if (topEstablishments.length > 0) {
      const topPlace = topEstablishments[0];
      insights.push({
        id: 5,
        type: 'info',
        title: 'Local Mais Visitado',
        message: `🏪 ${topPlace.name} - ${topPlace.visit_count} visitas`,
        priority: 5
      });
    }
    
    // Análise de padrões semanais
    if (weeklyData.length > 0) {
      const maxDay = weeklyData.reduce((max, day) => 
        day.total > max.total ? day : max
      );
      
      if (maxDay.total > 0) {
        insights.push({
          id: 6,
          type: 'info',
          title: 'Padrão Semanal',
          message: `📊 ${maxDay.day} é o dia com mais gastos`,
          priority: 6
        });
      }
    }
    
    return insights.sort((a, b) => a.priority - b.priority);
  }, [monthTotal, lastMonthTotal, categoryData, daysWithoutExpenses, topEstablishments, weeklyData]);

  const loadAllData = useCallback(async () => {
    if (!db || !user) return;
    
    try {
      setLoading(true);
      
      // Carrega todos os dados em paralelo
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
        daysNoExpenses,
        anomalousExpenses
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
        getDaysWithoutExpenses(),
        detectAnomalies()
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
      setDaysWithoutExpenses(daysNoExpenses);
      setAnomalies(anomalousExpenses);
      
      // Gera insights
      const newInsights = await generateInsights();
      setInsights(newInsights);
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [db, user, generateInsights]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAllData();
  }, [loadAllData]);

  // Prepara dados para gráficos
  const pieChartData = useMemo(() => {
    if (categoryData.length === 0) return [];
    
    const colors = [
      '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', 
      '#10B981', '#3B82F6', '#EF4444', '#84CC16'
    ];
    
    return categoryData.slice(0, 5).map((cat, index) => ({
      name: cat.name,
      population: cat.total,
      color: colors[index % colors.length],
      legendFontColor: '#374151',
      legendFontSize: 12
    }));
  }, [categoryData]);

  const lineChartData = useMemo(() => {
    if (weeklyData.length === 0) return null;
    
    return {
      labels: weeklyData.map(d => d.day),
      datasets: [{
        data: weeklyData.map(d => d.total),
        strokeWidth: 2
      }]
    };
  }, [weeklyData]);

  const chartConfig = {
    backgroundColor: '#FFFFFF',
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    style: {
      borderRadius: 16
    }
  };

  // Renderização condicional durante carregamento
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Carregando dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#6366F1']}
          tintColor="#6366F1"
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="light-content" backgroundColor="#6366F1" />
      
      <Animated.View style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }]
      }}>
        {/* Header com saudação */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Olá, {user?.name?.split(' ')[0] || 'Usuário'} 👋</Text>
          <Text style={styles.date}>{new Date().toLocaleDateString('pt-BR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</Text>
        </View>

        {/* Insights em destaque */}
        {insights.length > 0 && (
          <View style={styles.insightsContainer}>
            <Text style={styles.sectionTitle}>💡 Insights</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.insightsScroll}
            >
              {insights.map(insight => (
                <View 
                  key={insight.id} 
                  style={[
                    styles.insightCard,
                    insight.type === 'warning' && styles.insightWarning,
                    insight.type === 'success' && styles.insightSuccess,
                    insight.type === 'info' && styles.insightInfo
                  ]}
                >
                  <Text style={styles.insightTitle}>{insight.title}</Text>
                  <Text style={styles.insightMessage}>{insight.message}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Cards de resumo */}
        <View style={styles.summaryCards}>
          <TouchableOpacity 
            style={[styles.summaryCard, styles.todayCard]}
            onPress={() => navigation.navigate('Despesas')}
          >
            <Text style={styles.cardLabel}>Hoje</Text>
            <Text style={styles.cardValue}>{formatCurrency(todayTotal)}</Text>
            <Text style={styles.cardSubtext}>{todayCount} despesas</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.summaryCard, styles.weekCard]}
            onPress={() => navigation.navigate('Resumo Diário')}
          >
            <Text style={styles.cardLabel}>Semana</Text>
            <Text style={styles.cardValue}>{formatCurrency(weekTotal)}</Text>
            <Text style={styles.cardSubtext}>Últimos 7 dias</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.summaryCard, styles.monthCard]}
            onPress={() => navigation.navigate('Relatório Mensal')}
          >
            <Text style={styles.cardLabel}>Mês</Text>
            <Text style={styles.cardValue}>{formatCurrency(monthTotal)}</Text>
            <Text style={styles.cardSubtext}>
              {lastMonthTotal > 0 && (
                monthTotal > lastMonthTotal ? '📈 ' : '📉 '
              )}
              {Math.abs(((monthTotal - lastMonthTotal) / lastMonthTotal) * 100).toFixed(0)}%
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.summaryCard, styles.yearCard]}
            onPress={() => navigation.navigate('Resumo Anual')}
          >
            <Text style={styles.cardLabel}>Ano</Text>
            <Text style={styles.cardValue}>{formatCurrency(yearTotal)}</Text>
            <Text style={styles.cardSubtext}>{new Date().getFullYear()}</Text>
          </TouchableOpacity>
        </View>

        {/* Gráfico de linha - Evolução semanal */}
        {lineChartData && (
          <View style={styles.chartContainer}>
            <Text style={styles.sectionTitle}>📈 Evolução Semanal</Text>
            <LineChart
              data={lineChartData}
              width={screenWidth - 32}
              height={200}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withInnerLines={false}
              withOuterLines={true}
              withVerticalLabels={true}
              withHorizontalLabels={true}
              formatYLabel={(value) => `R$ ${value}`}
            />
          </View>
        )}

        {/* Gráfico de pizza - Categorias */}
        {pieChartData.length > 0 && (
          <View style={styles.chartContainer}>
            <Text style={styles.sectionTitle}>🎯 Gastos por Categoria</Text>
            <PieChart
              data={pieChartData}
              width={screenWidth - 32}
              height={200}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        )}

        {/* Top Estabelecimentos */}
        {topEstablishments.length > 0 && (
          <View style={styles.establishmentsContainer}>
            <Text style={styles.sectionTitle}>🏪 Locais Mais Visitados</Text>
            {topEstablishments.map((place, index) => (
              <View key={index} style={styles.establishmentCard}>
                <View style={styles.establishmentRank}>
                  <Text style={styles.rankNumber}>{index + 1}º</Text>
                </View>
                <View style={styles.establishmentInfo}>
                  <Text style={styles.establishmentName}>{place.name}</Text>
                  <Text style={styles.establishmentStats}>
                    {place.visit_count} visitas • {formatCurrency(place.total_spent)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Anomalias detectadas */}
        {anomalies.length > 0 && (
          <View style={styles.anomaliesContainer}>
            <Text style={styles.sectionTitle}>⚠️ Gastos Acima da Média</Text>
            {anomalies.map((expense, index) => (
              <View key={index} style={styles.anomalyCard}>
                <View style={styles.anomalyIcon}>
                  <Text style={styles.categoryIcon}>{expense.categoryIcon || '💸'}</Text>
                </View>
                <View style={styles.anomalyInfo}>
                  <Text style={styles.anomalyDescription}>{expense.description}</Text>
                  <Text style={styles.anomalyDetails}>
                    {formatCurrency(expense.amount)} • {formatDate(expense.date)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Despesas recentes */}
        <View style={styles.recentContainer}>
          <View style={styles.recentHeader}>
            <Text style={styles.sectionTitle}>📋 Últimas Despesas</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Despesas')}>
              <Text style={styles.seeAllButton}>Ver todas →</Text>
            </TouchableOpacity>
          </View>
          
          {recentExpenses.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>Nenhuma despesa registrada</Text>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => navigation.navigate('Despesas')}
              >
                <Text style={styles.addButtonText}>+ Adicionar Despesa</Text>
              </TouchableOpacity>
            </View>
          ) : (
            recentExpenses.map((expense, index) => (
              <TouchableOpacity 
                key={expense.id} 
                style={styles.expenseItem}
                onPress={() => navigation.navigate('Despesas')}
              >
                <View style={styles.expenseIcon}>
                  <Text style={styles.categoryIcon}>
                    {expense.categoryIcon || '💰'}
                  </Text>
                </View>
                <View style={styles.expenseInfo}>
                  <Text style={styles.expenseDescription}>{expense.description}</Text>
                  <Text style={styles.expenseDetails}>
                    {expense.categoryName || 'Sem categoria'} • {expense.paymentMethodName || 'Dinheiro'}
                  </Text>
                </View>
                <View style={styles.expenseAmount}>
                  <Text style={styles.expenseValue}>{formatCurrency(expense.amount)}</Text>
                  <Text style={styles.expenseDate}>{formatDate(expense.date)}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Botão flutuante */}
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => navigation.navigate('Despesas')}
          activeOpacity={0.8}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    backgroundColor: '#6366F1',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 24,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: '#E0E7FF',
    textTransform: 'capitalize',
  },
  insightsContainer: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  insightsScroll: {
    paddingVertical: 8,
  },
  insightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    minWidth: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  insightWarning: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  insightSuccess: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  insightInfo: {
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  insightMessage: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginTop: 20,
    justifyContent: 'space-between',
  },
  summaryCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  todayCard: {
    borderTopWidth: 4,
    borderTopColor: '#6366F1',
  },
  weekCard: {
    borderTopWidth: 4,
    borderTopColor: '#8B5CF6',
  },
  monthCard: {
    borderTopWidth: 4,
    borderTopColor: '#EC4899',
  },
  yearCard: {
    borderTopWidth: 4,
    borderTopColor: '#10B981',
  },
  cardLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  cardSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  establishmentsContainer: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  establishmentCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  establishmentRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6366F1',
  },
  establishmentInfo: {
    flex: 1,
  },
  establishmentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  establishmentStats: {
    fontSize: 14,
    color: '#6B7280',
  },
  anomaliesContainer: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  anomalyCard: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  anomalyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FDE68A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  anomalyInfo: {
    flex: 1,
  },
  anomalyDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 2,
  },
  anomalyDetails: {
    fontSize: 14,
    color: '#B45309',
  },
  recentContainer: {
    marginTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllButton: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },
  expenseItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  expenseIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryIcon: {
    fontSize: 20,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  expenseDetails: {
    fontSize: 14,
    color: '#6B7280',
  },
  expenseAmount: {
    alignItems: 'flex-end',
  },
  expenseValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
  },
  expenseDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '300',
  },
});