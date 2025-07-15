// components/AnnualExpenseSummary.js
// VERSÃO MELHORADA - VISUALIZAÇÃO APRIMORADA E MODERNA

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  FlatList,
  Dimensions,
  RefreshControl,
  Alert,
  Animated,
  StatusBar
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { PieChart, BarChart } from 'react-native-chart-kit';

const { width: screenWidth } = Dimensions.get('window');

export default function AnnualExpenseSummary() {
  const db = useSQLiteContext();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [yearModalVisible, setYearModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [annualData, setAnnualData] = useState({
    totalByCategory: [],
    monthlyData: [],
    topCategory: null,
    totalAmount: 0,
    totalTransactions: 0,
    averagePerTransaction: 0,
    biggestExpense: null,
    mostActiveMonth: null
  });

  // Animações melhoradas
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];
  const scaleAnim = useState(new Animated.Value(0.9))[0];

  // Anos disponíveis (últimos 5 anos + próximo ano)
  const availableYears = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const currentYear = new Date().getFullYear();
      return currentYear - 2 + i;
    }).reverse();
  }, []);

  useEffect(() => {
    if (db) {
      loadAnnualData();
    }
  }, [db, selectedYear]);

  // Animações de entrada mais suaves
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
  }, [annualData]);

  const loadAnnualData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      console.log(`📊 Carregando dados anuais para ${selectedYear}...`);

      // 1. Buscar gastos por categoria no ano
      const categoryData = await db.getAllAsync(`
        SELECT 
          COALESCE(c.name, 'Sem categoria') as category,
          COALESCE(c.icon, '📦') as icon,
          SUM(CAST(e.amount AS REAL)) as total,
          COUNT(*) as count,
          AVG(CAST(e.amount AS REAL)) as average
        FROM expenses e
        LEFT JOIN categories c ON e.categoryId = c.id
        WHERE strftime('%Y', e.date) = ?
        GROUP BY c.id, c.name, c.icon
        ORDER BY total DESC
      `, [selectedYear.toString()]);

      // 2. Buscar gastos mensais no ano
      const monthlyData = await db.getAllAsync(`
        SELECT 
          strftime('%m', e.date) as month,
          SUM(CAST(e.amount AS REAL)) as total,
          COUNT(*) as count
        FROM expenses e
        WHERE strftime('%Y', e.date) = ?
        GROUP BY strftime('%m', e.date)
        ORDER BY month
      `, [selectedYear.toString()]);

      // 3. Buscar total de transações e estatísticas gerais
      const statsData = await db.getFirstAsync(`
        SELECT 
          COUNT(*) as totalTransactions,
          AVG(CAST(amount AS REAL)) as averagePerTransaction,
          MAX(CAST(amount AS REAL)) as biggestExpense
        FROM expenses e
        WHERE strftime('%Y', e.date) = ?
      `, [selectedYear.toString()]);

      // 4. Buscar maior despesa individual
      const biggestExpenseData = await db.getFirstAsync(`
        SELECT 
          e.description,
          e.amount,
          c.name as category,
          c.icon as categoryIcon
        FROM expenses e
        LEFT JOIN categories c ON e.categoryId = c.id
        WHERE strftime('%Y', e.date) = ? AND CAST(e.amount AS REAL) = (
          SELECT MAX(CAST(amount AS REAL)) FROM expenses WHERE strftime('%Y', e.date) = ?
        )
        LIMIT 1
      `, [selectedYear.toString(), selectedYear.toString()]);

      // 5. Processar dados para os gráficos
      const processedData = processAnnualData(
        categoryData, 
        monthlyData, 
        statsData, 
        biggestExpenseData
      );
      
      // Debug: verificar dados processados
      console.log('📊 Dados processados:', {
        totalAmount: processedData.totalAmount,
        topCategory: processedData.topCategory,
        totalTransactions: processedData.totalTransactions
      });
      
      setAnnualData(processedData);

      console.log('✅ Dados anuais carregados:', processedData);

    } catch (error) {
      console.error('❌ Erro ao carregar dados anuais:', error);
      setError('Erro ao carregar dados. Tente novamente.');
      Alert.alert(
        'Erro', 
        'Não foi possível carregar os dados anuais. Verifique sua conexão e tente novamente.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [db, selectedYear]);

  function processAnnualData(categoryData, monthlyData, statsData, biggestExpenseData) {
    // Processar dados por categoria com cores melhoradas
    const totalByCategory = categoryData.map(item => ({
      name: item.category,
      icon: item.icon,
      amount: item.total || 0,
      count: item.count || 0,
      average: item.average || 0,
      color: getCategoryColor(item.category)
    }));

    // Categoria principal (maior gasto)
    const topCategory = totalByCategory.length > 0 ? totalByCategory[0] : null;

    // Total geral
    const totalAmount = totalByCategory.reduce((sum, cat) => sum + cat.amount, 0);

    // Processar dados mensais (garantir todos os 12 meses)
    const monthNames = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];

    const monthlyProcessed = monthNames.map((name, index) => {
      const monthNumber = (index + 1).toString().padStart(2, '0');
      const found = monthlyData.find(item => item.month === monthNumber);
      return {
        month: name,
        amount: found ? found.total : 0,
        count: found ? found.count : 0
      };
    });

    // Encontrar mês mais ativo
    const mostActiveMonth = monthlyProcessed.reduce((max, current) => 
      current.amount > max.amount ? current : max, 
      { month: '', amount: 0 }
    );

    return {
      totalByCategory,
      monthlyData: monthlyProcessed,
      topCategory,
      totalAmount,
      totalTransactions: statsData?.totalTransactions || 0,
      averagePerTransaction: statsData?.averagePerTransaction || 0,
      biggestExpense: biggestExpenseData ? {
        description: biggestExpenseData.description,
        amount: biggestExpenseData.amount,
        category: biggestExpenseData.category,
        categoryIcon: biggestExpenseData.categoryIcon
      } : null,
      mostActiveMonth
    };
  }

  // 🎨 CORES MELHORADAS COM GRADIENTES
  function getCategoryColor(categoryName) {
    const colors = {
      'Alimentação': ['#10b981', '#059669'],    // Verde
      'Transporte': ['#3b82f6', '#2563eb'],    // Azul
      'Moradia': ['#ef4444', '#dc2626'],       // Vermelho
      'Lazer': ['#f59e0b', '#d97706'],         // Amarelo
      'Saúde': ['#8b5cf6', '#7c3aed'],         // Roxo
      'Educação': ['#06b6d4', '#0891b2'],      // Ciano
      'Compras': ['#ec4899', '#db2777'],       // Rosa
      'Trabalho': ['#6b7280', '#4b5563'],      // Cinza
      'Outros': ['#9ca3af', '#6b7280']         // Cinza claro
    };
    return colors[categoryName]?.[0] || '#6b7280';
  }

  // 🔧 FUNÇÃO SEGURA PARA VALORES
  const SafeValue = (params) => {
    const { value, type = 'currency', ...options } = params || {};
    
    try {
      let displayValue;
      
      switch (type) {
        case 'currency':
          displayValue = formatCurrency(value, options);
          break;
        case 'percentage':
          displayValue = formatPercentage(value, options.total);
          break;
        case 'number':
          displayValue = formatNumber(value, options.compact);
          break;
        default:
          displayValue = String(value || '0');
      }
      
      // Se retornou algo inválido, força um valor padrão
      if (!displayValue || displayValue === 'undefined' || displayValue === 'null' || displayValue === '') {
        switch (type) {
          case 'currency':
            displayValue = 'R$ 0,00';
            break;
          case 'percentage':
            displayValue = '0%';
            break;
          default:
            displayValue = '0';
        }
      }
      
      return displayValue;
    } catch (error) {
      console.error('Erro no SafeValue:', error, params);
      return type === 'currency' ? 'R$ 0,00' : '0';
    }
  };

  // 🎯 FUNÇÃO ESPECÍFICA PARA CARDS (auto-detecta quando usar compact)
  const SafeCurrency = (value, forceCompact = false) => {
    try {
      const numValue = parseFloat(value);
      
      // Se forçou compacto OU valor é muito grande, usa compacto
      const shouldUseCompact = forceCompact || numValue >= 10000;
      
      return SafeValue({ 
        value: numValue, 
        type: "currency", 
        compact: shouldUseCompact 
      });
    } catch (error) {
      return 'R$ 0,00';
    }
  };

  // 💰 FUNÇÕES DE FORMATAÇÃO CORRIGIDAS - SEMPRE COM CENTAVOS
  const formatCurrency = (value, options = {}) => {
    try {
      const { compact = false } = options;
      
      // Converte para número de forma segura
      let numValue;
      if (typeof value === 'string') {
        numValue = parseFloat(value.replace(',', '.'));
      } else {
        numValue = parseFloat(value);
      }
      
      // Se não conseguir converter, retorna zero
      if (isNaN(numValue) || numValue === null || numValue === undefined) {
        return 'R$ 0,00';
      }
      
      // Formatação compacta para valores grandes (SEM centavos)
      if (compact) {
        if (numValue >= 1000000) {
          const millions = (numValue / 1000000).toFixed(1);
          return `R$ ${millions.replace('.', ',')}M`;
        }
        if (numValue >= 1000) {
          const thousands = (numValue / 1000).toFixed(numValue >= 10000 ? 0 : 1);
          return `R$ ${thousands.replace('.', ',')}K`;
        }
      }
      
      // Formatação padrão brasileira - SEMPRE COM CENTAVOS
      try {
        return numValue.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
          minimumFractionDigits: 2, // SEMPRE 2 casas decimais
          maximumFractionDigits: 2  // SEMPRE 2 casas decimais
        });
      } catch (error) {
        // Fallback manual se toLocaleString falhar
        const inteiro = Math.floor(numValue);
        const decimal = Math.round((numValue - inteiro) * 100).toString().padStart(2, '0');
        const inteiroFormatado = inteiro.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return `R$ ${inteiroFormatado},${decimal}`;
      }
    } catch (error) {
      console.error('Erro na formatação de moeda:', error, value);
      return 'R$ 0,00';
    }
  };

  const formatPercentage = (value, total) => {
    try {
      const numValue = parseFloat(value);
      const numTotal = parseFloat(total);
      
      if (isNaN(numValue) || isNaN(numTotal) || numTotal === 0) {
        return '0%';
      }
      
      const percentage = ((numValue / numTotal) * 100).toFixed(1);
      return `${percentage.replace('.', ',')}%`;
    } catch (error) {
      console.error('Erro na formatação de porcentagem:', error, value, total);
      return '0%';
    }
  };

  const formatNumber = (value, compact = false) => {
    try {
      let numValue;
      if (typeof value === 'string') {
        numValue = parseInt(value);
      } else {
        numValue = parseInt(value);
      }
      
      if (isNaN(numValue)) {
        return '0';
      }
      
      if (compact) {
        if (numValue >= 1000000) {
          return `${(numValue / 1000000).toFixed(1).replace('.', ',')}M`;
        }
        if (numValue >= 1000) {
          return `${(numValue / 1000).toFixed(numValue >= 10000 ? 0 : 1).replace('.', ',')}K`;
        }
      }
      
      try {
        return numValue.toLocaleString('pt-BR');
      } catch (error) {
        // Fallback manual
        return numValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      }
    } catch (error) {
      console.error('Erro na formatação de número:', error, value);
      return '0';
    }
  };

  // 🎨 FUNÇÃO PARA DETERMINAR COR DO VALOR
  function getValueColor(value, maxValue) {
    const percentage = (value / maxValue) * 100;
    if (percentage >= 80) return '#ef4444'; // Vermelho para valores altos
    if (percentage >= 60) return '#f59e0b'; // Amarelo para valores médio-altos
    if (percentage >= 40) return '#10b981'; // Verde para valores médios
    return '#6b7280'; // Cinza para valores baixos
  }

  // Pull to refresh
  const onRefresh = useCallback(() => {
    loadAnnualData(true);
  }, [loadAnnualData]);

  // Dados para o gráfico de pizza melhorados
  const pieChartData = useMemo(() => {
    return annualData.totalByCategory.slice(0, 5).map(item => ({
      name: `${item.name}\n${formatPercentage(item.amount, annualData.totalAmount)}`,
      population: item.amount,
      color: item.color,
      legendFontColor: '#374151',
      legendFontSize: 12
    }));
  }, [annualData.totalByCategory, annualData.totalAmount]);

  // Dados para o gráfico de barras melhorados com formatação
  const barChartData = useMemo(() => ({
    labels: annualData.monthlyData.map(item => item.month),
    datasets: [{
      data: annualData.monthlyData.map(item => item.amount || 0.1),
      color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
      strokeWidth: 3
    }]
  }), [annualData.monthlyData]);

  // 🎨 CONFIGURAÇÃO MELHORADA DOS GRÁFICOS com formatação brasileira
  const chartConfig = useMemo(() => ({
    backgroundColor: 'transparent',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientFromOpacity: 0,
    backgroundGradientTo: '#ffffff',
    backgroundGradientToOpacity: 0,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(55, 65, 81, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForBackgroundLines: {
      strokeDasharray: '3,3',
      stroke: '#e5e7eb',
      strokeWidth: 1
    },
    propsForLabels: {
      fontSize: 11,
      fontWeight: '600'
    },
    // Formatação customizada para valores nos gráficos
    formatYLabel: (value) => formatCurrency(value, { compact: true, showSymbol: false }),
    formatXLabel: (value) => value
  }), []);

  // 🎨 SKELETON LOADING COMPONENT
  const SkeletonCard = ({ width = '100%', height = 120 }) => (
    <View style={[styles.skeletonCard, { width, height }]}>
      <View style={styles.skeletonContent}>
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, { width: '60%' }]} />
        <View style={[styles.skeletonLine, { width: '40%' }]} />
      </View>
    </View>
  );

  const renderYearItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.yearItem,
        selectedYear === item && styles.yearItemSelected
      ]}
      onPress={() => {
        setSelectedYear(item);
        setYearModalVisible(false);
      }}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.yearItemText,
        selectedYear === item && styles.yearItemTextSelected
      ]}>
        {item}
      </Text>
      {selectedYear === item && (
        <View style={styles.yearCheckContainer}>
          <Text style={styles.yearCheckmark}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#10b981" />
        
        {/* Header Skeleton */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>📈 Resumo Anual</Text>
            <Text style={styles.subtitle}>Carregando dados para {selectedYear}...</Text>
            <View style={styles.yearSelectorSkeleton}>
              <ActivityIndicator size="small" color="#ffffff" />
            </View>
          </View>
        </View>

        {/* Content Skeletons */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <SkeletonCard height={140} />
          <View style={styles.skeletonGrid}>
            <SkeletonCard width="47%" height={100} />
            <SkeletonCard width="47%" height={100} />
            <SkeletonCard width="47%" height={100} />
            <SkeletonCard width="47%" height={100} />
          </View>
          <SkeletonCard height={200} />
          <SkeletonCard height={250} />
        </ScrollView>
      </View>
    );
  }

  if (error && !annualData.totalAmount) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <View style={styles.errorContent}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Ops! Algo deu errado</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadAnnualData()}>
            <Text style={styles.retryButtonText}>🔄 Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#10b981" />
      
      {/* Header Melhorado */}
      <View style={styles.header}>
        <View style={styles.headerBackground} />
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <Text style={styles.title}>📈 Resumo Anual</Text>
            <Text style={styles.subtitle}>Análise completa dos seus gastos</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.yearSelector}
            onPress={() => setYearModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.yearSelectorContent}>
              <Text style={styles.yearText}>{selectedYear}</Text>
              <View style={styles.yearArrowContainer}>
                <Text style={styles.yearArrow}>▼</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#10b981']}
            tintColor="#10b981"
            progressBackgroundColor="#ffffff"
          />
        }
      >
        <Animated.View style={{ 
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }]
        }}>
          {/* Card Principal Melhorado */}
          {annualData.topCategory && (
            <View style={styles.heroCard}>
              <View style={styles.heroBackground} />
              <View style={styles.heroContent}>
                <View style={styles.heroIcon}>
                  <Text style={styles.heroEmoji}>{annualData.topCategory.icon}</Text>
                </View>
                <View style={styles.heroText}>
                  <Text style={styles.heroLabel}>Categoria que mais gastou</Text>
                  <Text style={styles.heroCategory}>
                    {annualData.topCategory.name}
                  </Text>
                  <Text style={styles.heroAmount}>
                    {formatCurrency(annualData.topCategory.amount, { compact: true })}
                  </Text>
                  <View style={styles.heroStats}>
                    <View style={styles.heroStat}>
                      <Text style={styles.heroStatValue}>
                        {formatPercentage(annualData.topCategory.amount, annualData.totalAmount)}
                      </Text>
                      <Text style={styles.heroStatLabel}>do total</Text>
                    </View>
                    <View style={styles.heroStat}>
                      <Text style={styles.heroStatValue}>
                        {annualData.topCategory.count}
                      </Text>
                      <Text style={styles.heroStatLabel}>transações</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Cards de Estatísticas Melhorados */}
          <View style={styles.statsContainer}>
            <Text style={styles.sectionTitle}>Estatísticas Gerais</Text>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, styles.statCardPrimary]}>
                <View style={styles.statIconContainer}>
                  <Text style={styles.statIcon}>💰</Text>
                </View>
                <Text style={styles.statValue}>
                  {SafeCurrency(annualData.totalAmount, true)}
                </Text>
                <Text style={styles.statLabel}>Total Gasto</Text>
                <View style={styles.statProgress}>
                  <View style={[styles.statProgressBar, { width: '100%' }]} />
                </View>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  <Text style={styles.statIcon}>📊</Text>
                </View>
                <Text style={styles.statValue}>
                  {SafeCurrency(annualData.totalAmount / 12)}
                </Text>
                <Text style={styles.statLabel}>Média Mensal</Text>
                <View style={styles.statProgress}>
                  <View style={[styles.statProgressBar, { width: '75%' }]} />
                </View>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  <Text style={styles.statIcon}>🎯</Text>
                </View>
                <Text style={styles.statValue}>
                  {SafeValue({ 
                    value: annualData.totalTransactions, 
                    type: "number", 
                    compact: true 
                  })}
                </Text>
                <Text style={styles.statLabel}>Transações</Text>
                <View style={styles.statProgress}>
                  <View style={[styles.statProgressBar, { width: '60%' }]} />
                </View>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  <Text style={styles.statIcon}>💳</Text>
                </View>
                <Text style={styles.statValue}>
                  {SafeCurrency(annualData.averagePerTransaction)}
                </Text>
                <Text style={styles.statLabel}>Média/Transação</Text>
                <View style={styles.statProgress}>
                  <View style={[styles.statProgressBar, { width: '45%' }]} />
                </View>
              </View>
            </View>
          </View>

          {/* Cards de Insights Melhorados */}
          <View style={styles.insightsContainer}>
            <Text style={styles.sectionTitle}>Insights do Ano</Text>
            
            {/* Maior Despesa */}
            {annualData.biggestExpense && (
              <View style={styles.insightCard}>
                <View style={styles.insightHeader}>
                  <View style={styles.insightIconContainer}>
                    <Text style={styles.insightIcon}>💎</Text>
                  </View>
                  <View style={styles.insightHeaderText}>
                    <Text style={styles.insightTitle}>Maior Despesa Individual</Text>
                    <Text style={styles.insightAmount}>
                      {SafeCurrency(annualData.biggestExpense.amount)}
                    </Text>
                  </View>
                </View>
                <View style={styles.insightContent}>
                  <Text style={styles.insightDescription}>
                    {annualData.biggestExpense.description}
                  </Text>
                  <View style={styles.insightBadge}>
                    <Text style={styles.insightBadgeText}>
                      📂 {annualData.biggestExpense.category || 'Sem categoria'}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Mês Mais Ativo */}
            {annualData.mostActiveMonth && annualData.mostActiveMonth.amount > 0 && (
              <View style={styles.insightCard}>
                <View style={styles.insightHeader}>
                  <View style={styles.insightIconContainer}>
                    <Text style={styles.insightIcon}>🔥</Text>
                  </View>
                  <View style={styles.insightHeaderText}>
                    <Text style={styles.insightTitle}>Mês Mais Movimentado</Text>
                    <Text style={styles.insightAmount}>
                      {SafeCurrency(annualData.mostActiveMonth.amount)}
                    </Text>
                  </View>
                </View>
                <View style={styles.insightContent}>
                  <Text style={styles.insightDescription}>
                    {annualData.mostActiveMonth.month} foi seu mês com mais gastos
                  </Text>
                  <View style={styles.insightBadge}>
                    <Text style={styles.insightBadgeText}>
                      📊 {formatNumber(annualData.mostActiveMonth.count)} transações
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Top Categorias Melhoradas */}
          {annualData.totalByCategory.length > 1 && (
            <View style={styles.categoriesContainer}>
              <Text style={styles.sectionTitle}>Top Categorias</Text>
              <View style={styles.categoriesGrid}>
                {annualData.totalByCategory.slice(1, 4).map((category, index) => (
                  <View key={index} style={styles.categoryCard}>
                    <View style={styles.categoryHeader}>
                      <View style={[
                        styles.categoryIconContainer,
                        { backgroundColor: category.color }
                      ]}>
                        <Text style={styles.categoryIcon}>{category.icon}</Text>
                      </View>
                      <Text style={styles.categoryRank}>#{index + 2}</Text>
                    </View>
                    <Text style={styles.categoryName}>{category.name}</Text>
                    <Text style={styles.categoryAmount}>
                      {SafeCurrency(category.amount)}
                    </Text>
                    <View style={styles.categoryProgress}>
                      <View style={[
                        styles.categoryProgressBar, 
                        { 
                          width: `${(category.amount / annualData.totalByCategory[0].amount) * 100}%`,
                          backgroundColor: category.color 
                        }
                      ]} />
                    </View>
                    <Text style={styles.categoryPercentage}>
                      {formatPercentage(category.amount, annualData.totalAmount)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Gráficos Melhorados */}
          {annualData.totalAmount > 0 && (
            <View style={styles.chartsContainer}>
              {/* Gráfico de Barras */}
              <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <View style={styles.chartIconContainer}>
                    <Text style={styles.chartIcon}>📊</Text>
                  </View>
                  <View style={styles.chartHeaderText}>
                    <Text style={styles.chartTitle}>Evolução Mensal</Text>
                    <Text style={styles.chartSubtitle}>Gastos ao longo do ano</Text>
                  </View>
                </View>
                <View style={styles.chartContainer}>
                  <BarChart
                    data={barChartData}
                    width={screenWidth - 80}
                    height={220}
                    chartConfig={chartConfig}
                    style={styles.chart}
                    showValuesOnTopOfBars={false}
                    fromZero={true}
                    showBarTops={false}
                    withInnerLines={true}
                    withHorizontalLabels={true}
                    withVerticalLabels={true}
                  />
                </View>
              </View>

              {/* Gráfico de Pizza */}
              <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <View style={styles.chartIconContainer}>
                    <Text style={styles.chartIcon}>🥧</Text>
                  </View>
                  <View style={styles.chartHeaderText}>
                    <Text style={styles.chartTitle}>Distribuição por Categoria</Text>
                    <Text style={styles.chartSubtitle}>Onde você mais gasta</Text>
                  </View>
                </View>
                <View style={styles.chartContainer}>
                  {pieChartData.length > 0 ? (
                    <PieChart
                      data={pieChartData}
                      width={screenWidth - 80}
                      height={220}
                      chartConfig={chartConfig}
                      accessor="population"
                      backgroundColor="transparent"
                      paddingLeft="15"
                      style={styles.chart}
                      hasLegend={true}
                      center={[10, 0]}
                    />
                  ) : (
                    <View style={styles.noDataContainer}>
                      <Text style={styles.noDataIcon}>📊</Text>
                      <Text style={styles.noDataText}>Nenhum dado para exibir</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Resumo Final Melhorado */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryBackground} />
            <View style={styles.summaryContent}>
              <Text style={styles.summaryTitle}>Resumo Final de {selectedYear}</Text>
              <Text style={styles.summaryAmount}>
                {SafeCurrency(annualData.totalAmount, true)}
              </Text>
              <View style={styles.summaryStats}>
                <View style={styles.summaryStat}>
                  <Text style={styles.summaryStatValue}>
                    {SafeValue({ value: annualData.totalByCategory.length, type: "number" })}
                  </Text>
                  <Text style={styles.summaryStatLabel}>categorias</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryStat}>
                  <Text style={styles.summaryStatValue}>
                    {SafeValue({ value: annualData.totalTransactions, type: "number", compact: true })}
                  </Text>
                  <Text style={styles.summaryStatLabel}>transações</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryStat}>
                  <Text style={styles.summaryStatValue}>
                    {SafeValue({ value: Math.round(annualData.totalTransactions / 12), type: "number" })}
                  </Text>
                  <Text style={styles.summaryStatLabel}>por mês</Text>
                </View>
              </View>
              {annualData.totalTransactions > 0 && (
                <Text style={styles.summaryAverage}>
                  Média de {SafeCurrency(annualData.averagePerTransaction)} por transação
                </Text>
              )}
            </View>
          </View>

          {/* Empty State Melhorado */}
          {annualData.totalAmount === 0 && (
            <View style={styles.emptyStateContainer}>
              <View style={styles.emptyStateContent}>
                <Text style={styles.emptyStateIcon}>📊</Text>
                <Text style={styles.emptyStateTitle}>Nenhum gasto em {selectedYear}</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Comece a registrar suas despesas para ver estatísticas incríveis aqui!
                </Text>
                <View style={styles.emptyStateAction}>
                  <Text style={styles.emptyStateActionText}>
                    Toque em "Despesas" no menu para começar
                  </Text>
                </View>
              </View>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Modal Melhorado */}
      <Modal
        visible={yearModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setYearModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Ano</Text>
              <TouchableOpacity 
                onPress={() => setYearModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={availableYears}
              keyExtractor={(item) => item.toString()}
              renderItem={renderYearItem}
              style={styles.yearsList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  // Header Melhorado
  header: {
    position: 'relative',
    paddingTop: 50,
    paddingBottom: 40,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#10b981',
    opacity: 0.95,
  },
  headerContent: {
    position: 'relative',
    zIndex: 1,
  },
  headerTop: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    textAlign: 'center',
  },
  yearSelector: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 30,
    paddingHorizontal: 24,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  yearSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  yearText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1f2937',
    marginRight: 12,
  },
  yearArrowContainer: {
    width: 24,
    height: 24,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearArrow: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '700',
  },
  yearSelectorSkeleton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 30,
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },

  // Content
  content: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -20,
    paddingTop: 30,
    paddingHorizontal: 20,
  },

  // Hero Card Melhorado
  heroCard: {
    position: 'relative',
    borderRadius: 24,
    padding: 28,
    marginBottom: 32,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  heroBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#10b981',
    opacity: 0.95,
  },
  heroContent: {
    position: 'relative',
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroIcon: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  heroEmoji: {
    fontSize: 36,
  },
  heroText: {
    flex: 1,
  },
  heroLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroCategory: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 16,
    letterSpacing: -1.2,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroStats: {
    flexDirection: 'row',
    gap: 20,
  },
  heroStat: {
    alignItems: 'center',
  },
  heroStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  heroStatLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },

  // Section Titles
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 16,
    marginLeft: 4,
  },

  // Stats Melhoradas
  statsContainer: {
    marginBottom: 32,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    width: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  statCardPrimary: {
    backgroundColor: '#f0fdf4',
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIcon: {
    fontSize: 24,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10b981',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  statProgress: {
    width: '100%',
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    overflow: 'hidden',
  },
  statProgressBar: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 2,
  },

  // Insights Melhorados
  insightsContainer: {
    marginBottom: 32,
  },
  insightCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  insightIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#fef3c7',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  insightIcon: {
    fontSize: 24,
  },
  insightHeaderText: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  insightAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#10b981',
    letterSpacing: -0.5,
  },
  insightContent: {
    marginLeft: 64,
  },
  insightDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  insightBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  insightBadgeText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },

  // Categories Melhoradas
  categoriesContainer: {
    marginBottom: 32,
  },
  categoriesGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  categoryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  categoryIcon: {
    fontSize: 20,
    color: '#ffffff',
  },
  categoryRank: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9ca3af',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10b981',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  categoryProgress: {
    width: '100%',
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  categoryProgressBar: {
    height: '100%',
    borderRadius: 2,
  },
  categoryPercentage: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    textAlign: 'center',
  },

  // Charts Melhorados
  chartsContainer: {
    marginBottom: 32,
  },
  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 28,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  chartIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  chartIcon: {
    fontSize: 24,
  },
  chartHeaderText: {
    flex: 1,
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  chartContainer: {
    alignItems: 'center',
  },
  chart: {
    borderRadius: 16,
  },
  noDataContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataIcon: {
    fontSize: 48,
    marginBottom: 12,
    opacity: 0.6,
  },
  noDataText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },

  // Summary Melhorado
  summaryCard: {
    position: 'relative',
    borderRadius: 24,
    padding: 32,
    marginBottom: 32,
    overflow: 'hidden',
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  summaryBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1f2937',
    opacity: 0.95,
  },
  summaryContent: {
    position: 'relative',
    zIndex: 1,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryAmount: {
    fontSize: 36,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 20,
    letterSpacing: -1.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryStat: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  summaryStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  summaryStatLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  summaryAverage: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    textAlign: 'center',
  },

  // Empty State Melhorado
  emptyStateContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 48,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  emptyStateContent: {
    alignItems: 'center',
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 20,
    opacity: 0.6,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  emptyStateAction: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  emptyStateActionText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
    textAlign: 'center',
  },

  // Skeleton Loading
  skeletonCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  skeletonContent: {
    flex: 1,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    marginBottom: 8,
  },

  // Modal Melhorado
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    width: '85%',
    maxHeight: '60%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1f2937',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 18,
    color: '#6b7280',
    fontWeight: '700',
  },
  yearsList: {
    maxHeight: 300,
  },
  yearItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  yearItemSelected: {
    backgroundColor: '#f0fdf4',
  },
  yearItemText: {
    fontSize: 18,
    color: '#374151',
    fontWeight: '600',
  },
  yearItemTextSelected: {
    color: '#10b981',
    fontWeight: '800',
  },
  yearCheckContainer: {
    width: 24,
    height: 24,
    backgroundColor: '#10b981',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearCheckmark: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '700',
  },

  // Error State
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 40,
  },
  errorContent: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 32,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});