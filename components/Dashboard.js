// components/Dashboard.js - VERSÃO COM HEADER COMPACTO
// 🎯 INCLUI DADOS DE DEMONSTRAÇÃO PARA MELHOR VISUALIZAÇÃO QUANDO O BANCO ESTÁ VAZIO
// 💰 LAYOUT COMPACTO COM VALOR DO MÊS EM DESTAQUE REDUZIDO
// 📅 CORREÇÃO COMPLETA DAS DATAS NA ATIVIDADE RECENTE
// 🔄 BOTÃO REFRESH REPOSICIONADO E MENOR
// 📏 HEADER ULTRA COMPACTO - ESPAÇAMENTOS REDUZIDOS
// ⭐ VALOR PRINCIPAL REDUZIDO PARA 26px + ESPAÇAMENTOS MENORES
// 📉 SEÇÃO DE COMPARAÇÃO MAIS COMPACTA
// 🎯 SEÇÃO DE COMPARAÇÃO MICRO PARA NÃO COMPETIR COM O VALOR PRINCIPAL
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Animated,
  Dimensions,
  StatusBar,
  Platform
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { PieChart, LineChart } from 'react-native-chart-kit';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

const { width: screenWidth } = Dimensions.get('window');

export default function Dashboard() {
  const db = useSQLiteContext();
  const navigation = useNavigation();
  
  // 🔧 ESTADOS SIMPLIFICADOS
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    todaySpending: 0,
    weekSpending: 0,
    monthSpending: 0,
    yearSpending: 0,
    todayTransactions: 0,
    weekTransactions: 0,
    monthTransactions: 0,
    topCategory: null,
    recentExpenses: [],
    categoryDistribution: [],
    weeklyTrend: [],
    monthlyComparison: { current: 0, previous: 0 },
    insights: []
  });

  // 🎬 ANIMAÇÕES CORRIGIDAS - Array fixo para 4 cards
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const cardAnimations = useRef([
    new Animated.Value(1), // Card 0 - Sempre visível desde o início
    new Animated.Value(1), // Card 1 - Sempre visível desde o início  
    new Animated.Value(1), // Card 2 - Sempre visível desde o início
    new Animated.Value(1), // Card 3 - Sempre visível desde o início
  ]).current;
  const hasAnimated = useRef(false);

  // 🔄 DEBOUNCE
  const debounceTimeout = useRef(null);
  const debounceCall = useCallback((func, delay = 300) => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = setTimeout(func, delay);
  }, []);

  // 🚀 FUNÇÃO PRINCIPAL DE CARREGAMENTO
  const loadDashboardData = useCallback(async (isRefresh = false) => {
    if (!db) return;

    try {
      console.log('🔄 Carregando dashboard...', { isRefresh, isReady });
      
      if (isRefresh) {
        setIsRefreshing(true);
      } else if (!isReady) {
        setIsInitialLoading(true);
      }

      const [
        todayData,
        weekData,
        monthData,
        yearData,
        categoryData,
        recentData,
        weeklyTrendData,
        previousMonthData
      ] = await Promise.all([
        getTodayData(),
        getWeekData(),
        getMonthData(),
        getYearData(),
        getCategoryDistribution(),
        getRecentExpenses(),
        getWeeklyTrend(),
        getPreviousMonthData()
      ]);

      const insights = generateInsights({
        today: todayData,
        week: weekData,
        month: monthData,
        year: yearData,
        categories: categoryData,
        previousMonth: previousMonthData
      });

      const newData = {
        todaySpending: todayData.total,
        weekSpending: weekData.total,
        monthSpending: monthData.total,
        yearSpending: yearData.total,
        todayTransactions: todayData.count,
        weekTransactions: weekData.count,
        monthTransactions: monthData.count,
        topCategory: categoryData[0] || null,
        recentExpenses: recentData,
        categoryDistribution: categoryData.slice(0, 5),
        weeklyTrend: weeklyTrendData,
        monthlyComparison: {
          current: monthData.total,
          previous: previousMonthData.total
        },
        insights
      };

      setDashboardData(newData);

      // 🎬 ANIMA APENAS O CONTEÚDO PRINCIPAL, NÃO OS CARDS
      if (!hasAnimated.current && !isRefresh) {
        hasAnimated.current = true;
        startMainAnimations();
      }

      if (!isReady) {
        setIsReady(true);
      }

    } catch (error) {
      console.error('❌ Erro ao carregar dashboard:', error);
      if (!isRefresh) {
        Alert.alert('Erro', 'Não foi possível carregar os dados do dashboard.');
      }
    } finally {
      setIsInitialLoading(false);
      setIsRefreshing(false);
    }
  }, [db, isReady]);

  // 🎬 ANIMAÇÕES PRINCIPAIS - SEM AFETAR OS CARDS
  const startMainAnimations = useCallback(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      })
    ]).start();

    // 🎯 CARDS PERMANECEM SEMPRE VISÍVEIS (opacity: 1, scale: 1)
    console.log('✅ Animações principais iniciadas - Cards permanecem visíveis');
  }, [fadeAnim, slideAnim]);

  // 🔄 CARREGAMENTO INICIAL
  useEffect(() => {
    if (db && !isReady) {
      debounceCall(() => {
        loadDashboardData(false);
      }, 100);
    }
  }, [db, isReady, loadDashboardData, debounceCall]);

  // 🔄 RECARREGA QUANDO A TELA FICA ATIVA
  useFocusEffect(
    useCallback(() => {
      if (db && isReady) {
        debounceCall(() => {
          loadDashboardData(false);
        }, 200);
      }
    }, [db, isReady, loadDashboardData, debounceCall])
  );

  // 🔄 SISTEMA DE NOTIFICAÇÃO AUTOMÁTICA
  useEffect(() => {
    if (!global.expenseListeners) {
      global.expenseListeners = [];
    }

    const updateFunction = () => {
      if (db && isReady && !isRefreshing) {
        debounceCall(() => {
          console.log('📢 Recebeu notificação - atualizando dashboard...');
          loadDashboardData(false);
        }, 500);
      }
    };

    global.expenseListeners.push(updateFunction);

    return () => {
      if (global.expenseListeners) {
        const index = global.expenseListeners.indexOf(updateFunction);
        if (index > -1) {
          global.expenseListeners.splice(index, 1);
        }
      }
    };
  }, [db, isReady, isRefreshing, loadDashboardData, debounceCall]);

  // 📊 FUNÇÕES DE DADOS
  const getTodayData = async () => {
    const result = await db.getFirstAsync(`
      SELECT 
        COALESCE(SUM(CAST(amount AS REAL)), 0) as total,
        COUNT(*) as count
      FROM expenses 
      WHERE DATE(date) = DATE('now', 'localtime')
    `);
    
    // 🎯 DEMO: Se não há dados, simula valores para demonstração
    if (!result || result.total === 0) {
      return { total: 127.50, count: 3 }; // Valores de exemplo para demonstração
    }
    
    return result || { total: 0, count: 0 };
  };

  const getWeekData = async () => {
    const result = await db.getFirstAsync(`
      SELECT 
        COALESCE(SUM(CAST(amount AS REAL)), 0) as total,
        COUNT(*) as count
      FROM expenses 
      WHERE DATE(date) >= DATE('now', 'localtime', '-7 days')
    `);
    
    // 🎯 DEMO: Se não há dados, simula valores para demonstração
    if (!result || result.total === 0) {
      return { total: 856.40, count: 15 }; // Valores de exemplo
    }
    
    return result || { total: 0, count: 0 };
  };

  const getMonthData = async () => {
    const result = await db.getFirstAsync(`
      SELECT 
        COALESCE(SUM(CAST(amount AS REAL)), 0) as total,
        COUNT(*) as count
      FROM expenses 
      WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now', 'localtime')
    `);
    
    // 🎯 DEMO: Se não há dados, simula valores para demonstração
    if (!result || result.total === 0) {
      return { total: 2847.90, count: 47 }; // Valores de exemplo maiores
    }
    
    return result || { total: 0, count: 0 };
  };

  const getYearData = async () => {
    const result = await db.getFirstAsync(`
      SELECT 
        COALESCE(SUM(CAST(amount AS REAL)), 0) as total,
        COUNT(*) as count
      FROM expenses 
      WHERE strftime('%Y', date) = strftime('%Y', 'now', 'localtime')
    `);
    
    // 🎯 DEMO: Se não há dados, simula valores para demonstração
    if (!result || result.total === 0) {
      return { total: 15420.65, count: 234 }; // Valores anuais de exemplo
    }
    
    return result || { total: 0, count: 0 };
  };

  const getCategoryDistribution = async () => {
    const results = await db.getAllAsync(`
      SELECT 
        COALESCE(c.name, 'Sem categoria') as category,
        COALESCE(c.icon, '📦') as icon,
        SUM(CAST(e.amount AS REAL)) as total,
        COUNT(*) as count
      FROM expenses e
      LEFT JOIN categories c ON e.categoryId = c.id
      WHERE strftime('%Y-%m', e.date) = strftime('%Y-%m', 'now', 'localtime')
      GROUP BY c.id, c.name, c.icon
      ORDER BY total DESC
      LIMIT 8
    `);

    // 🎯 DEMO: Se não há dados, simula distribuição para demonstração
    if (!results || results.length === 0) {
      return [
        { category: 'Alimentação', icon: '🍽️', total: 856.40, count: 18, color: getColorForIndex(0) },
        { category: 'Transporte', icon: '🚗', total: 624.20, count: 12, color: getColorForIndex(1) },
        { category: 'Lazer', icon: '🎮', total: 385.70, count: 8, color: getColorForIndex(2) },
        { category: 'Saúde', icon: '🏥', total: 247.90, count: 5, color: getColorForIndex(3) },
        { category: 'Casa', icon: '🏠', total: 456.80, count: 6, color: getColorForIndex(4) },
        { category: 'Educação', icon: '📚', total: 189.50, count: 3, color: getColorForIndex(5) }
      ];
    }

    return results.map((item, index) => ({
      ...item,
      color: getColorForIndex(index)
    }));
  };

  const getRecentExpenses = async () => {
    const result = await db.getAllAsync(`
      SELECT 
        e.id,
        e.description,
        CAST(e.amount AS REAL) as amount,
        e.date,
        COALESCE(c.name, 'Sem categoria') as category,
        COALESCE(c.icon, '📦') as icon
      FROM expenses e
      LEFT JOIN categories c ON e.categoryId = c.id
      ORDER BY e.date DESC
      LIMIT 8
    `);

    // 🎯 DEMO: Se não há dados, simula despesas para demonstração
    if (!result || result.length === 0) {
      const today = new Date().toISOString();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dayBefore = new Date();
      dayBefore.setDate(dayBefore.getDate() - 2);
      
      return [
        {
          id: 'demo1',
          description: 'Almoço no restaurante',
          amount: 45.50,
          date: today,
          category: 'Alimentação',
          icon: '🍽️'
        },
        {
          id: 'demo2', 
          description: 'Combustível',
          amount: 85.00,
          date: today,
          category: 'Transporte',
          icon: '⛽'
        },
        {
          id: 'demo3',
          description: 'Supermercado',
          amount: 156.80,
          date: yesterday.toISOString(),
          category: 'Alimentação', 
          icon: '🛒'
        },
        {
          id: 'demo4',
          description: 'Farmácia',
          amount: 32.90,
          date: yesterday.toISOString(),
          category: 'Saúde',
          icon: '💊'
        },
        {
          id: 'demo5',
          description: 'Netflix',
          amount: 25.90,
          date: dayBefore.toISOString(),
          category: 'Lazer',
          icon: '🎬'
        }
      ];
    }
    
    return result;
  };

  const getWeeklyTrend = async () => {
    const results = await db.getAllAsync(`
      SELECT 
        DATE(date, 'localtime') as date,
        SUM(CAST(amount AS REAL)) as total
      FROM expenses 
      WHERE DATE(date) >= DATE('now', 'localtime', '-7 days')
      GROUP BY DATE(date, 'localtime')
      ORDER BY date ASC
    `);

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const found = results.find(r => r.date === dateStr);
      
      // 🎯 DEMO: Se não há dados, simula valores para demonstração do gráfico
      let demoValue = 0;
      if (!results || results.length === 0) {
        const demoValues = [85.50, 134.20, 67.80, 198.40, 156.70, 89.30, 124.50];
        demoValue = demoValues[6 - i] || 0;
      }
      
      last7Days.push({
        date: dateStr,
        total: found ? found.total : demoValue,
        label: date.toLocaleDateString('pt-BR', { weekday: 'short' })
      });
    }

    return last7Days;
  };

  const getPreviousMonthData = async () => {
    const result = await db.getFirstAsync(`
      SELECT 
        COALESCE(SUM(CAST(amount AS REAL)), 0) as total
      FROM expenses 
      WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now', 'localtime', '-1 month')
    `);
    
    // 🎯 DEMO: Se não há dados, simula valores para demonstração da comparação
    if (!result || result.total === 0) {
      return { total: 2456.30 }; // Valor anterior menor para mostrar aumento
    }
    
    return result || { total: 0 };
  };

  const generateInsights = (data) => {
    const insights = [];

    const monthChange = data.month.total - data.previousMonth.total;
    const monthChangePercent = data.previousMonth.total > 0 
      ? ((monthChange / data.previousMonth.total) * 100).toFixed(1)
      : 0;

    if (monthChange > 0) {
      insights.push({
        icon: '📈',
        type: 'warning',
        title: 'Gastos em Alta',
        message: `Você gastou ${formatPercentage(monthChangePercent)}% mais este mês`
      });
    } else if (monthChange < 0) {
      insights.push({
        icon: '📉',
        type: 'success',
        title: 'Economia!',
        message: `Você economizou ${formatPercentage(Math.abs(monthChangePercent))}% este mês`
      });
    }

    if (data.categories.length > 0) {
      const topCat = data.categories[0];
      const percentage = data.month.total > 0 
        ? ((topCat.total / data.month.total) * 100).toFixed(1)
        : 0;
      
      if (percentage > 40) {
        insights.push({
          icon: topCat.icon,
          type: 'info',
          title: 'Categoria Dominante',
          message: `${percentage}% dos gastos são em ${topCat.category}`
        });
      }
    }

    if (data.today.total === 0) {
      insights.push({
        icon: '🎯',
        type: 'success',
        title: 'Dia Sem Gastos!',
        message: 'Parabéns! Você não gastou nada hoje'
      });
    }

    return insights.slice(0, 3);
  };

  // 🎨 FUNÇÕES DE FORMATAÇÃO
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatPercentage = (value) => {
    return Math.abs(parseFloat(value)).toFixed(1);
  };

  const getColorForIndex = (index) => {
    const colors = ['#10B981', '#3B82F6', '#EF4444', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
    return colors[index % colors.length];
  };

  // 🔧 FUNÇÃO CORRIGIDA PARA FORMATAÇÃO DE DATA
  const formatDateRelative = (dateString) => {
    try {
      console.log('🔍 Formatando data:', dateString);
      
      if (!dateString) {
        console.warn('⚠️ Data vazia recebida');
        return 'Data inválida';
      }

      // Cria data a partir da string do banco
      let date;
      
      // Se a data contém 'T' é ISO format
      if (dateString.includes('T')) {
        date = new Date(dateString);
      } else {
        // Se não, assume formato YYYY-MM-DD e adiciona horário local
        const parts = dateString.split(' ')[0]; // Pega só a parte da data
        date = new Date(parts + 'T00:00:00.000Z');
      }
      
      // Verifica se a data é válida
      if (isNaN(date.getTime())) {
        console.warn('⚠️ Data inválida:', dateString);
        return 'Data inválida';
      }
      
      // Converte para data local (remove timezone offset)
      const localDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
      
      // Cria datas de comparação em horário local
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const expenseDate = new Date(localDate);
      expenseDate.setHours(0, 0, 0, 0);
      
      // Calcula diferença em dias
      const diffTime = today.getTime() - expenseDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      console.log('📅 Debug data:', {
        original: dateString,
        parsed: date.toISOString(),
        local: localDate.toISOString(),
        expense: expenseDate.toISOString(),
        today: today.toISOString(),
        diffDays
      });

      // Retorna texto baseado na diferença
      if (diffDays === 0) {
        return 'Hoje';
      } else if (diffDays === 1) {
        return 'Ontem';
      } else if (diffDays > 1 && diffDays < 7) {
        return `${diffDays} dias atrás`;
      } else if (diffDays < 0) {
        // Data no futuro - pode acontecer por problemas de timezone
        return 'Hoje';
      } else {
        // Mais de 7 dias - formata data completa
        return localDate.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: localDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
        });
      }
      
    } catch (error) {
      console.error('❌ Erro ao formatar data:', error, dateString);
      return 'Data inválida';
    }
  };

  // 🔄 NAVEGAÇÃO SEGURA
  const safeNavigate = useCallback((screenName) => {
    try {
      if (navigation && isReady) {
        navigation.navigate(screenName);
      }
    } catch (error) {
      console.error('Erro na navegação:', error);
    }
  }, [navigation, isReady]);

  // 🔄 REFRESH MANUAL
  const onRefresh = useCallback(() => {
    if (!isRefreshing) {
      loadDashboardData(true);
    }
  }, [isRefreshing, loadDashboardData]);

  // 📊 DADOS PARA GRÁFICOS
  const pieChartData = useMemo(() => {
    return dashboardData.categoryDistribution.map(cat => ({
      name: cat.category,
      population: cat.total,
      color: cat.color,
      legendFontColor: '#374151',
      legendFontSize: 11
    }));
  }, [dashboardData.categoryDistribution]);

  const lineChartData = useMemo(() => ({
    labels: dashboardData.weeklyTrend.map(item => item.label),
    datasets: [{
      data: dashboardData.weeklyTrend.map(item => item.total || 0.01),
      color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
      strokeWidth: 3
    }]
  }), [dashboardData.weeklyTrend]);

  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientFromOpacity: 0,
    backgroundGradientTo: '#ffffff',
    backgroundGradientToOpacity: 0,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    propsForLabels: { fontSize: 10 }
  };

  // 🎭 COMPONENTE STAT CARD - CORRIGIDO PARA SEMPRE FICAR VISÍVEL
  const StatCard = React.memo(({ icon, title, value, subtitle, color, index, onPress }) => {
    // 🔧 DEBUG: Log para verificar se todos os cards estão sendo renderizados
    console.log(`🎯 Renderizando StatCard ${index}: ${title}`);
    
    return (
      <View style={[styles.statCard, { borderTopColor: color }]}>
        <TouchableOpacity 
          style={styles.statCardTouchable}
          activeOpacity={0.8}
          onPress={onPress}
        >
          <View style={[styles.statIconContainer, { backgroundColor: color + '15' }]}>
            <Text style={styles.statIcon}>{icon}</Text>
          </View>
          <Text style={styles.statTitle}>{title}</Text>
          <Text style={[styles.statValue, { color }]}>{value}</Text>
          {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
        </TouchableOpacity>
      </View>
    );
  });

  const QuickAction = React.memo(({ icon, title, subtitle, color, onPress }) => (
    <TouchableOpacity 
      style={[styles.quickAction, { borderLeftColor: color }]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: color + '15' }]}>
        <Text style={styles.quickActionIconText}>{icon}</Text>
      </View>
      <View style={styles.quickActionContent}>
        <Text style={styles.quickActionTitle}>{title}</Text>
        <Text style={styles.quickActionSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.quickActionArrow}>→</Text>
    </TouchableOpacity>
  ));

  // 🔧 COMPONENTE CORRIGIDO PARA ATIVIDADE RECENTE
  const RecentExpenseItem = React.memo(({ expense }) => {
    const formattedDate = formatDateRelative(expense.date);
    
    return (
      <TouchableOpacity style={styles.recentExpenseItem} activeOpacity={0.8}>
        <View style={styles.expenseIconContainer}>
          <Text style={styles.expenseIcon}>{expense.icon}</Text>
        </View>
        <View style={styles.expenseInfo}>
          <Text style={styles.expenseDescription} numberOfLines={1}>
            {expense.description}
          </Text>
          <Text style={styles.expenseCategory}>
            {expense.category} • {formattedDate}
          </Text>
        </View>
        <Text style={styles.expenseAmount}>
          {formatCurrency(expense.amount)}
        </Text>
      </TouchableOpacity>
    );
  });

  const InsightCard = React.memo(({ insight }) => (
    <View style={[
      styles.insightCard,
      { 
        backgroundColor: insight.type === 'success' ? '#f0fdf4' : 
                        insight.type === 'warning' ? '#fef3c7' : '#eff6ff',
        borderLeftColor: insight.type === 'success' ? '#10b981' : 
                        insight.type === 'warning' ? '#f59e0b' : '#3b82f6'
      }
    ]}>
      <View style={styles.insightHeader}>
        <Text style={styles.insightIcon}>{insight.icon}</Text>
        <Text style={styles.insightTitle}>{insight.title}</Text>
      </View>
      <Text style={styles.insightMessage}>{insight.message}</Text>
    </View>
  ));

  // 🔄 LOADING INICIAL
  if (isInitialLoading || !isReady) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#6366F1" />
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Carregando dashboard...</Text>
      </View>
    );
  }

  // ✅ RENDER PRINCIPAL
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6366F1" />
      
      <View style={styles.header}>
        <View style={styles.headerPattern} />
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            {/* Botão será reposicionado para baixo da comparação */}
          </View>
          
          <View style={styles.mainSummary}>
            <Text style={styles.mainSummaryLabel}>Gastos do Mês</Text>
            <Text style={styles.mainSummaryValue}>
              {formatCurrency(dashboardData.monthSpending)}
            </Text>
            {/* Indicador de dados demo */}
            {dashboardData.monthSpending === 2847.90 && (
              <Text style={styles.demoIndicator}>
                📊 Dados de demonstração
              </Text>
            )}
            <View style={styles.comparisonContainer}>
              <View style={styles.comparisonRow}>
                <Text style={styles.comparisonIcon}>
                  {dashboardData.monthlyComparison.current > dashboardData.monthlyComparison.previous ? '📈' : '📉'}
                </Text>
                <Text style={styles.comparisonText}>vs. mês anterior:</Text>
              </View>
              <Text style={[
                styles.comparisonValue,
                { 
                  color: dashboardData.monthlyComparison.current > dashboardData.monthlyComparison.previous 
                    ? '#fbbf24' : '#34d399' 
                }
              ]}>
                {formatCurrency(dashboardData.monthlyComparison.previous)}
              </Text>
              <Text style={[
                styles.comparisonDifference,
                { 
                  color: dashboardData.monthlyComparison.current > dashboardData.monthlyComparison.previous 
                    ? '#fbbf24' : '#34d399' 
                }
              ]}>
                {dashboardData.monthlyComparison.previous > 0 ? (
                  dashboardData.monthlyComparison.current > dashboardData.monthlyComparison.previous ? 
                  `+${formatCurrency(dashboardData.monthlyComparison.current - dashboardData.monthlyComparison.previous)}` :
                  `${formatCurrency(dashboardData.monthlyComparison.current - dashboardData.monthlyComparison.previous)}`
                ) : (
                  'Primeiro mês'
                )}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#6366F1']}
            tintColor="#6366F1"
          />
        }
      >
        <Animated.View style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }}>
          
          {/* 🎯 SEÇÃO DE CARDS - ESPAÇAMENTO MÍNIMO */}
          <View style={[styles.section, { marginTop: 4, paddingTop: 1, marginBottom: 15 }]}>
            <Text style={styles.sectionTitle}>📊 Visão Geral</Text>
            <View style={styles.statsGrid}>
              <StatCard
                icon="🌟"
                title="Hoje"
                value={formatCurrency(dashboardData.todaySpending)}
                subtitle={`${dashboardData.todayTransactions} transações`}
                color="#10B981"
                index={0}
              />
              <StatCard
                icon="📅"
                title="Esta Semana"
                value={formatCurrency(dashboardData.weekSpending)}
                subtitle={`${dashboardData.weekTransactions} transações`}
                color="#3B82F6"
                index={1}
              />
              <StatCard
                icon="📆"
                title="Este Mês"
                value={formatCurrency(dashboardData.monthSpending)}
                subtitle={`${dashboardData.monthTransactions} transações`}
                color="#8B5CF6"
                index={2}
              />
              <StatCard
                icon="🗓️"
                title="Este Ano"
                value={formatCurrency(dashboardData.yearSpending)}
                subtitle="Total anual"
                color="#F59E0B"
                index={3}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚡ Ações Rápidas</Text>
            <View style={styles.quickActionsContainer}>
              <QuickAction
                icon="➕"
                title="Nova Despesa"
                subtitle="Registrar novo gasto"
                color="#10B981"
                onPress={() => safeNavigate('Despesas')}
              />
              <QuickAction
                icon="📊"
                title="Resumo Anual"
                subtitle="Ver análise completa"
                color="#3B82F6"
                onPress={() => safeNavigate('Resumo Anual')}
              />
              <QuickAction
                icon="🏪"
                title="Estabelecimentos"
                subtitle="Gerenciar locais"
                color="#8B5CF6"
                onPress={() => safeNavigate('Estabelecimentos')}
              />
              <QuickAction
                icon="📂"
                title="Categorias"
                subtitle="Organizar despesas"
                color="#F59E0B"
                onPress={() => safeNavigate('Categorias')}
              />
            </View>
          </View>

          {dashboardData.weeklyTrend.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📈 Tendência da Semana</Text>
              <View style={styles.chartCard}>
                <LineChart
                  data={lineChartData}
                  width={screenWidth - 40}
                  height={180}
                  chartConfig={chartConfig}
                  bezier
                  style={styles.chart}
                  withInnerLines={false}
                  withDots={true}
                />
              </View>
            </View>
          )}

          {dashboardData.categoryDistribution.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🥧 Gastos por Categoria</Text>
              <View style={styles.chartCard}>
                <PieChart
                  data={pieChartData}
                  width={screenWidth - 40}
                  height={160}
                  chartConfig={chartConfig}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  hasLegend={false}
                  center={[10, 0]}
                />
                <View style={styles.legendContainer}>
                  {dashboardData.categoryDistribution.slice(0, 4).map((cat, index) => (
                    <View key={index} style={styles.legendItem}>
                      <View style={[styles.legendColor, { backgroundColor: cat.color }]} />
                      <Text style={styles.legendText} numberOfLines={1}>
                        {cat.category}
                      </Text>
                      <Text style={styles.legendValue}>
                        {formatCurrency(cat.total)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {dashboardData.insights.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💡 Insights</Text>
              <View style={styles.insightsContainer}>
                {dashboardData.insights.map((insight, index) => (
                  <InsightCard key={index} insight={insight} />
                ))}
              </View>
            </View>
          )}

          {dashboardData.recentExpenses.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🕒 Atividade Recente</Text>
                <TouchableOpacity onPress={() => safeNavigate('Resumo Diário')}>
                  <Text style={styles.seeAllText}>Ver tudo →</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.recentExpensesContainer}>
                {dashboardData.recentExpenses.slice(0, 6).map((expense, index) => (
                  <RecentExpenseItem key={expense.id} expense={expense} />
                ))}
              </View>
            </View>
          )}

          {/* Empty state só aparece se não há dados reais E não há dados de demo */}
          {dashboardData.monthSpending === 0 && dashboardData.recentExpenses.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>💰</Text>
              <Text style={styles.emptyTitle}>Comece a registrar!</Text>
              <Text style={styles.emptySubtitle}>
                Adicione suas primeiras despesas para ver estatísticas incríveis aqui.
              </Text>
              <TouchableOpacity 
                style={styles.emptyButton}
                onPress={() => safeNavigate('Despesas')}
              >
                <Text style={styles.emptyButtonText}>➕ Primeira Despesa</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F9FAFB',
    margin: 0,
    padding: 0,
  },
  
  // 🎯 HEADER COMPACTO - ESTILOS AJUSTADOS
  header: {
    backgroundColor: '#6366F1',
    paddingTop: Platform.OS === 'ios' ? 40 : 18, // 🔥 REDUZIDO iOS: 44→40, Android: 20→18
    paddingBottom: 6, // 🔥 REDUZIDO de 12 para 6 (mais compacto)
    overflow: 'hidden',
    position: 'relative',
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowColor: 'transparent',
    marginBottom: 0,
    zIndex: 1,
  },
  headerPattern: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#5A5FC7',
    opacity: 0.1,
  },
  headerContent: { 
    paddingHorizontal: 20, 
    position: 'relative', 
    zIndex: 1,
    alignItems: 'center',
    paddingVertical: 2, // 🔥 REDUZIDO de 6 para 2 (mais compacto)
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 4, // 🔥 REDUZIDO de 8 para 4 (mais compacto)
    paddingHorizontal: 8,
  },
  
  // 🎯 MAIN SUMMARY COMPACTO
  mainSummary: { 
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    width: '100%',
    paddingVertical: 0, // 🔥 REDUZIDO de 4 para 0 (sem padding vertical)
  },
  mainSummaryLabel: {
    fontSize: 13, // 🔥 AUMENTADO para 13
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 2, // 🔥 REDUZIDO de 4 para 2 (mais compacto)
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  mainSummaryValue: {
    fontSize: 28, // 🔥 AUMENTADO para 28
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 3, // 🔥 REDUZIDO de 6 para 3 (mais compacto)
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: -0.8,
    lineHeight: 30, // 🔥 AUMENTADO para 30
  },
  demoIndicator: {
    fontSize: 10, // 🔥 AUMENTADO de 9 para 10
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 4, // 🔥 REDUZIDO de 8 para 4 (mais compacto)
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8, // 🔥 AUMENTADO de 6 para 8
    paddingVertical: 2,
    borderRadius: 4, // 🔥 AUMENTADO de 3 para 4
    alignSelf: 'center',
  },
  
  // 🎯 COMPARAÇÃO CENTRALIZADA (sem botão refresh)
  comparisonContainer: { 
    alignItems: 'center',
    paddingHorizontal: 18, // 🔥 AUMENTADO de 14 para 18
    paddingVertical: 6, // 🔥 REDUZIDO de 8 para 6 (mais compacto)
    borderRadius: 12, // 🔥 AUMENTADO de 10 para 12
    minWidth: 280, // 🔥 AUMENTADO de 260 para 280
    maxWidth: '85%', // 🔥 AUMENTADO de 80% para 85%
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    marginTop: 0, // 🔥 REDUZIDO de 4 para 0 (sem margem superior)
    alignSelf: 'center', // 🔥 NOVO: centraliza o container
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2, // 🔥 REDUZIDO de 4 para 2 (mais compacto)
  },
  comparisonIcon: {
    fontSize: 14, // 🔥 AUMENTADO de 12 para 14
    marginRight: 6, // 🔥 AUMENTADO de 5 para 6
  },
  comparisonText: { 
    fontSize: 13, // 🔥 AUMENTADO de 11 para 13
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  comparisonValue: { 
    fontSize: 18, // 🔥 AUMENTADO de 16 para 18
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 1, // 🔥 REDUZIDO de 3 para 1 (mais compacto)
  },
  comparisonDifference: {
    fontSize: 14, // 🔥 AUMENTADO de 12 para 14
    fontWeight: '700',
    textAlign: 'center',
  },
  
  // 🎯 RESTO DOS ESTILOS PERMANECEM IGUAIS
  content: { 
    flex: 1, 
    marginTop: 0,
    minHeight: 1
  },
  section: { marginBottom: 10, paddingHorizontal: 16 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 10,
    textAlign: 'center',
  },
  seeAllText: { fontSize: 14, color: '#6366F1', fontWeight: '600' },
  
  // Stats Grid
  statsGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 8,
    justifyContent: 'space-between'
  },
  statCard: {
    width: (screenWidth - 48) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderTopWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
    opacity: 1,
    transform: [{ scale: 1 }],
  },
  statCardTouchable: {
    padding: 8,
    alignItems: 'flex-start',
  },
  statIconContainer: {
    width: 28, height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statIcon: { fontSize: 14 },
  statTitle: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  statValue: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  statSubtitle: { fontSize: 9, color: '#9CA3AF' },
  
  quickActionsContainer: { gap: 8 },
  quickAction: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  quickActionIcon: {
    width: 40, height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  quickActionIconText: { fontSize: 18 },
  quickActionContent: { flex: 1 },
  quickActionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  quickActionSubtitle: { fontSize: 12, color: '#6B7280' },
  quickActionArrow: { fontSize: 18, color: '#9CA3AF', fontWeight: '600' },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  chart: { borderRadius: 8 },
  legendContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendColor: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  legendText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  legendValue: { fontSize: 14, color: '#1F2937', fontWeight: '600' },
  insightsContainer: { gap: 8 },
  insightCard: { borderRadius: 12, padding: 12, borderLeftWidth: 3 },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightIcon: { fontSize: 18, marginRight: 8 },
  insightTitle: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  insightMessage: { fontSize: 13, color: '#4B5563', lineHeight: 18 },
  recentExpensesContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  recentExpenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  expenseIconContainer: {
    width: 40, height: 40,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  expenseIcon: { fontSize: 18 },
  expenseInfo: { flex: 1 },
  expenseDescription: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  expenseCategory: { fontSize: 12, color: '#6B7280' },
  expenseAmount: { fontSize: 15, fontWeight: '700', color: '#059669' },
  emptyState: { alignItems: 'center', padding: 32, marginTop: 20 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  bottomSpacer: { height: 20 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 20,
  },
  loadingText: { 
    marginTop: 16, 
    fontSize: 16, 
    color: '#6B7280',
    textAlign: 'center'
  },
});