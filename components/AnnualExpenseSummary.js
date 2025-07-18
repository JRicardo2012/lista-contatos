// components/AnnualExpenseSummary.js
// VERSÃO 2.0 - LAYOUT MELHORADO COM FORMATAÇÃO PT-BR
// Inclui:
// - Gráficos com valores formatados em PT-BR (R$ 1.234,56)
// - Legenda customizada para o gráfico de pizza
// - Valores detalhados por mês no gráfico de linha
// - Cards de métricas animados
// - Layout vertical para categorias

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
  StatusBar,
  Platform
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { PieChart, BarChart, LineChart } from 'react-native-chart-kit';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function AnnualExpenseSummary() {
  const db = useSQLiteContext();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [yearModalVisible, setYearModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('total'); // Para cards interativos
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

  // Animações
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];
  const scaleAnim = useState(new Animated.Value(0.9))[0];
  const [cardAnimations] = useState([...Array(4)].map(() => new Animated.Value(0)));

  // Anos disponíveis
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

  // Animações de entrada aprimoradas
  useEffect(() => {
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
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      })
    ]).start();

    // Anima cards em sequência
    cardAnimations.forEach((anim, index) => {
      Animated.spring(anim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        delay: index * 100,
        useNativeDriver: true,
      }).start();
    });
  }, [annualData]);

  const loadAnnualData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      // 1. Buscar gastos por categoria no ano
      const categoryData = await db.getAllAsync(`
        SELECT 
          COALESCE(c.name, 'Sem categoria') as category,
          COALESCE(c.icon, '📦') as icon,
          SUM(CAST(e.amount AS REAL)) as total,
          COUNT(*) as count,
          AVG(CAST(e.amount AS REAL)) as average,
          MAX(CAST(e.amount AS REAL)) as max_expense,
          MIN(CAST(e.amount AS REAL)) as min_expense
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
          COUNT(*) as count,
          AVG(CAST(e.amount AS REAL)) as average
        FROM expenses e
        WHERE strftime('%Y', e.date) = ?
        GROUP BY strftime('%m', e.date)
        ORDER BY month
      `, [selectedYear.toString()]);

      // 3. Buscar estatísticas gerais
      const statsData = await db.getFirstAsync(`
        SELECT 
          COUNT(*) as totalTransactions,
          AVG(CAST(amount AS REAL)) as averagePerTransaction,
          MAX(CAST(amount AS REAL)) as biggestExpense,
          MIN(CAST(amount AS REAL)) as smallestExpense,
          SUM(CAST(amount AS REAL)) as totalAmount
        FROM expenses e
        WHERE strftime('%Y', e.date) = ?
      `, [selectedYear.toString()]);

      // 4. Buscar maior despesa individual
      const biggestExpenseData = await db.getFirstAsync(`
        SELECT 
          e.description,
          e.amount,
          e.date,
          c.name as category,
          c.icon as categoryIcon
        FROM expenses e
        LEFT JOIN categories c ON e.categoryId = c.id
        WHERE strftime('%Y', e.date) = ? AND CAST(e.amount AS REAL) = (
          SELECT MAX(CAST(amount AS REAL)) FROM expenses WHERE strftime('%Y', date) = ?
        )
        LIMIT 1
      `, [selectedYear.toString(), selectedYear.toString()]);

      // 5. Processar dados
      const processedData = processAnnualData(
        categoryData, 
        monthlyData, 
        statsData, 
        biggestExpenseData
      );
      
      setAnnualData(processedData);

    } catch (error) {
      console.error('❌ Erro ao carregar dados anuais:', error);
      setError('Erro ao carregar dados. Tente novamente.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [db, selectedYear]);

  function processAnnualData(categoryData, monthlyData, statsData, biggestExpenseData) {
    // Processar dados por categoria com cores
    const colors = [
      '#10B981', '#3B82F6', '#EF4444', '#F59E0B', '#8B5CF6',
      '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'
    ];

    const totalByCategory = categoryData.map((item, index) => ({
      name: item.category,
      icon: item.icon,
      amount: item.total || 0,
      count: item.count || 0,
      average: item.average || 0,
      maxExpense: item.max_expense || 0,
      minExpense: item.min_expense || 0,
      color: colors[index % colors.length],
      percentage: 0 // Será calculado depois
    }));

    // Calcula porcentagens
    const totalAmount = statsData?.totalAmount || 0;
    totalByCategory.forEach(cat => {
      cat.percentage = totalAmount > 0 ? (cat.amount / totalAmount) * 100 : 0;
    });

    // Categoria principal
    const topCategory = totalByCategory.length > 0 ? totalByCategory[0] : null;

    // Processar dados mensais
    const monthNames = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];

    const monthlyProcessed = monthNames.map((name, index) => {
      const monthNumber = (index + 1).toString().padStart(2, '0');
      const found = monthlyData.find(item => item.month === monthNumber);
      return {
        month: name,
        monthNumber: index + 1,
        amount: found ? found.total : 0,
        count: found ? found.count : 0,
        average: found ? found.average : 0
      };
    });

    // Encontrar mês mais ativo
    const mostActiveMonth = monthlyProcessed.reduce((max, current) => 
      current.amount > max.amount ? current : max, 
      { month: '', amount: 0, count: 0 }
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
        date: biggestExpenseData.date,
        category: biggestExpenseData.category,
        categoryIcon: biggestExpenseData.categoryIcon
      } : null,
      mostActiveMonth,
      smallestExpense: statsData?.smallestExpense || 0
    };
  }

  // Formatações melhoradas com padrão PT-BR
  const formatCurrency = (value, compact = false, showSymbol = true) => {
    if (value === null || value === undefined || (value === 0 && !compact)) {
      return showSymbol ? 'R$ 0,00' : '0,00';
    }
    
    const numValue = parseFloat(value) || 0;
    
    // Formato compacto para valores grandes
    if (compact && numValue >= 1000) {
      const prefix = showSymbol ? 'R$ ' : '';
      if (numValue >= 1000000) {
        // Milhões: 1.5M ao invés de 1,5M (padrão internacional)
        return `${prefix}${(numValue / 1000000).toFixed(1).replace('.', ',')}M`;
      }
      // Milhares: 15.8K ao invés de 15,8K
      return `${prefix}${(numValue / 1000).toFixed(1).replace('.', ',')}K`;
    }
    
    // Formato completo PT-BR
    if (!showSymbol) {
      return numValue.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
    
    // Formato moeda PT-BR: R$ 1.234,56
    return numValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatPercentage = (value) => {
    const numValue = parseFloat(value) || 0;
    return `${numValue.toFixed(1).replace('.', ',')}%`;
  };

  const formatNumber = (value) => {
    if (value === null || value === undefined) return '0';
    const numValue = parseInt(value) || 0;
    return numValue.toLocaleString('pt-BR');
  };

  // Pull to refresh
  const onRefresh = useCallback(() => {
    loadAnnualData(true);
  }, [loadAnnualData]);

  // Dados para gráficos otimizados
  const pieChartData = useMemo(() => {
    return annualData.totalByCategory.slice(0, 5).map(item => ({
      name: item.name,
      population: item.amount,
      color: item.color,
      legendFontColor: '#374151',
      legendFontSize: 11
    }));
  }, [annualData.totalByCategory]);

  const lineChartData = useMemo(() => ({
    labels: annualData.monthlyData ? annualData.monthlyData.map(item => item.month) : [],
    datasets: [{
      data: annualData.monthlyData ? annualData.monthlyData.map(item => item.amount || 0.01) : [0.01], // Evita zero que pode causar erro
      color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
      strokeWidth: 3
    }]
  }), [annualData.monthlyData]);

  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientFromOpacity: 0,
    backgroundGradientTo: '#ffffff',
    backgroundGradientToOpacity: 0,
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    propsForLabels: {
      fontSize: 10
    }
  };

  // Componente de Card Métrica Interativo
  const MetricCard = ({ icon, title, value, subtitle, color, index, onPress }) => (
    <Animated.View style={{
      transform: [{
        scale: cardAnimations[index] || 1
      }],
      opacity: cardAnimations[index] || 1
    }}>
      <TouchableOpacity 
        style={[styles.metricCard, { borderTopColor: color }]}
        activeOpacity={0.8}
        onPress={onPress}
      >
        <View style={[styles.metricIconContainer, { backgroundColor: color + '15' }]}>
          <Text style={styles.metricIcon}>{icon}</Text>
        </View>
        <Text style={styles.metricTitle}>{title}</Text>
        <Text style={[styles.metricValue, { color }]}>{value || 'R$ 0,00'}</Text>
        {subtitle && <Text style={styles.metricSubtitle} numberOfLines={2}>{subtitle}</Text>}
      </TouchableOpacity>
    </Animated.View>
  );

  // Componente de Categoria Card
  const CategoryCard = ({ category, index }) => (
    <TouchableOpacity 
      style={[styles.categoryCard, { borderLeftColor: category.color }]}
      activeOpacity={0.8}
    >
      <View style={styles.categoryContent}>
        <View style={styles.categoryLeft}>
          <View style={[styles.categoryIcon, { backgroundColor: category.color + '15' }]}>
            <Text style={styles.categoryEmoji}>{category.icon}</Text>
          </View>
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryName} numberOfLines={1}>{category.name}</Text>
            <View style={styles.categoryStats}>
              <Text style={styles.categoryStatInline}>
                {category.count} transações • {formatPercentage(category.percentage)} do total
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.categoryRight}>
          <Text style={[styles.categoryRank, { color: category.color }]}>#{index + 1}</Text>
          <Text style={[styles.categoryAmount, { color: category.color }]}>
            {formatCurrency(category.amount)}
          </Text>
        </View>
      </View>
      <View style={styles.categoryProgressBar}>
        <View 
          style={[
            styles.categoryProgressFill, 
            { 
              width: `${category.percentage}%`,
              backgroundColor: category.color 
            }
          ]} 
        />
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#6366F1" />
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Preparando análise de {selectedYear}...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6366F1" />
      
      {/* Header Redesenhado */}
      <View style={styles.header}>
        <View style={styles.headerPattern} />
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>📊 Resumo Anual</Text>
            <TouchableOpacity 
              style={styles.yearButton}
              onPress={() => setYearModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.yearButtonText}>{selectedYear}</Text>
              <Text style={styles.yearButtonIcon}>▼</Text>
            </TouchableOpacity>
          </View>
          
          {/* Total Principal */}
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total de Gastos em {selectedYear}</Text>
            <Text style={styles.totalAmount}>
              {formatCurrency(annualData.totalAmount)}
            </Text>
            <View style={styles.totalStats}>
              <View style={styles.totalStat}>
                <Text style={styles.totalStatValue}>{formatNumber(annualData.totalTransactions)}</Text>
                <Text style={styles.totalStatLabel}>transações</Text>
              </View>
              <View style={styles.totalStatDivider} />
              <View style={styles.totalStat}>
                <Text style={styles.totalStatValue}>
                  {annualData.monthlyData && annualData.monthlyData.filter(m => m.amount > 0).length > 0 ? 
                    formatCurrency(
                      annualData.totalAmount / 
                      annualData.monthlyData.filter(m => m.amount > 0).length
                    ) : 
                    'R$ 0,00'
                  }
                </Text>
                <Text style={styles.totalStatLabel}>
                  média {
                    annualData.monthlyData && annualData.monthlyData.filter(m => m.amount > 0).length > 0 && 
                    annualData.monthlyData.filter(m => m.amount > 0).length < 12 ? 
                      'real' : 
                      'mensal'
                  }
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#6366F1']}
            tintColor="#6366F1"
          />
        }
      >
        <Animated.View style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }]
        }}>
          
          {/* Cards de Métricas */}
          <View style={styles.metricsGrid}>
            <MetricCard
              icon="📅"
              title={
                annualData.monthlyData && annualData.monthlyData.filter(m => m.amount > 0).length > 0 && 
                annualData.monthlyData.filter(m => m.amount > 0).length < 12 ? 
                  "Média Real" : 
                  "Média Mensal"
              }
              value={
                annualData.monthlyData && annualData.monthlyData.filter(m => m.amount > 0).length > 0 ?
                  formatCurrency(
                    annualData.totalAmount / 
                    annualData.monthlyData.filter(m => m.amount > 0).length
                  ) :
                  'R$ 0,00'
              }
              subtitle={`${annualData.monthlyData ? annualData.monthlyData.filter(m => m.amount > 0).length : 0} meses ativos`}
              color="#10B981"
              index={0}
            />
            <MetricCard
              icon="💰"
              title="Média/Transação"
              value={formatCurrency(annualData.averagePerTransaction)}
              subtitle={`${annualData.totalTransactions} transações`}
              color="#3B82F6"
              index={1}
            />
            <MetricCard
              icon="🚀"
              title="Maior Gasto"
              value={formatCurrency(annualData.biggestExpense?.amount || 0)}
              subtitle={annualData.biggestExpense?.description}
              color="#EF4444"
              index={2}
            />
            <MetricCard
              icon="🏆"
              title="Categoria Top"
              value={annualData.topCategory?.name || 'Nenhuma'}
              subtitle={annualData.topCategory ? formatCurrency(annualData.topCategory.amount) : 'R$ 0,00'}
              color="#8B5CF6"
              index={3}
            />
          </View>

          {/* Gráfico de Linha - Evolução Mensal */}
          <View style={styles.chartSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📈 Evolução Mensal</Text>
              <Text style={styles.sectionSubtitle}>Acompanhe seus gastos mês a mês</Text>
            </View>
            <View style={styles.chartCard}>
              {annualData.monthlyData && annualData.monthlyData.length > 0 && (
                <>
                  <LineChart
                    data={lineChartData}
                    width={screenWidth - 48}
                    height={220}
                    chartConfig={{
                      ...chartConfig,
                      formatYLabel: (value) => {
                        const num = parseFloat(value);
                        if (num >= 1000000) {
                          return `${(num / 1000000).toFixed(1).replace('.', ',')}M`;
                        }
                        if (num >= 1000) {
                          return `${(num / 1000).toFixed(1).replace('.', ',')}k`;
                        }
                        return num.toFixed(0);
                      },
                      propsForDots: {
                        r: "5",
                        strokeWidth: "2",
                        stroke: "#6366F1"
                      }
                    }}
                    bezier
                    style={styles.chart}
                    withInnerLines={false}
                    withOuterLines={true}
                    withHorizontalLabels={true}
                    withVerticalLabels={true}
                    fromZero={true}
                    segments={4}
                    withDots={true}
                    getDotColor={(dataPoint, dataPointIndex) => '#6366F1'}
                  />
                  {/* Valores dos meses */}
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.monthlyValues}
                    contentContainerStyle={{ paddingRight: 20 }}
                  >
                    {annualData.monthlyData && annualData.monthlyData.map((month, index) => (
                      <View key={index} style={styles.monthValue}>
                        <Text style={styles.monthValueLabel}>{month.month}</Text>
                        <Text style={[
                          styles.monthValueAmount,
                          month.amount === 0 && styles.monthValueZero
                        ]}>
                          {formatCurrency(month.amount)}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </>
              )}
            </View>
          </View>

          {/* Top Categorias */}
          <View style={styles.categoriesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🏆 Top Categorias</Text>
              <Text style={styles.sectionSubtitle}>Onde você mais gasta</Text>
            </View>
            <View style={styles.categoriesList}>
              {annualData.totalByCategory && annualData.totalByCategory.slice(0, 5).map((category, index) => (
                <CategoryCard key={index} category={category} index={index} />
              ))}
              {annualData.totalByCategory && annualData.totalByCategory.length > 5 && (
                <TouchableOpacity style={styles.viewAllButton} activeOpacity={0.8}>
                  <Text style={styles.viewAllText}>
                    Ver todas ({annualData.totalByCategory.length} categorias)
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Gráfico de Pizza */}
          <View style={styles.chartSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🥧 Distribuição por Categoria</Text>
              <Text style={styles.sectionSubtitle}>Como seus gastos estão divididos</Text>
            </View>
            <View style={styles.chartCard}>
              {pieChartData.length > 0 && (
                <>
                  <PieChart
                    data={pieChartData}
                    width={screenWidth - 48}
                    height={200}
                    chartConfig={{
                      ...chartConfig,
                      color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`
                    }}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="15"
                    hasLegend={false}
                    center={[10, 0]}
                  />
                  {/* Legenda customizada com valores formatados */}
                  <View style={styles.pieChartLegend}>
                    {annualData.totalByCategory && annualData.totalByCategory.slice(0, 5).map((item, index) => (
                      <View key={index} style={styles.legendItem}>
                        <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                        <Text style={styles.legendText} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.legendPercent}>
                          {formatPercentage(item.percentage)}
                        </Text>
                        <Text style={styles.legendValue}>
                          {formatCurrency(item.amount)}
                        </Text>
                      </View>
                    ))}
                    {/* Total */}
                    {annualData.totalByCategory && annualData.totalByCategory.length > 5 && (
                      <View style={[styles.legendItem, styles.legendOthers]}>
                        <View style={[styles.legendColor, { backgroundColor: '#9CA3AF' }]} />
                        <Text style={styles.legendText}>
                          Outras ({annualData.totalByCategory.length - 5})
                        </Text>
                        <Text style={styles.legendPercent}>
                          {formatPercentage(
                            annualData.totalByCategory.slice(5).reduce((sum, cat) => sum + cat.percentage, 0)
                          )}
                        </Text>
                        <Text style={styles.legendValue}>
                          {formatCurrency(
                            annualData.totalByCategory.slice(5).reduce((sum, cat) => sum + cat.amount, 0)
                          )}
                        </Text>
                      </View>
                    )}
                    <View style={[styles.legendItem, styles.legendTotal]}>
                      <Text style={styles.legendTotalText}>Total Geral</Text>
                      <Text style={styles.legendTotalValue}>
                        {formatCurrency(annualData.totalAmount)}
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Insights */}
          {annualData.biggestExpense && (
            <View style={styles.insightCard}>
              <View style={styles.insightHeader}>
                <Text style={styles.insightIcon}>💡</Text>
                <Text style={styles.insightTitle}>Insight do Ano</Text>
              </View>
              <Text style={styles.insightText}>
                Sua maior despesa foi "{annualData.biggestExpense.description}" 
                no valor de {formatCurrency(annualData.biggestExpense.amount)} 
                na categoria {annualData.biggestExpense.category || 'Sem categoria'}.
              </Text>
              {annualData.mostActiveMonth && annualData.mostActiveMonth.amount > 0 && (
                <Text style={styles.insightText}>
                  {annualData.mostActiveMonth.month} foi o mês com mais gastos, 
                  totalizando {formatCurrency(annualData.mostActiveMonth.amount)} 
                  em {annualData.mostActiveMonth.count} transações.
                </Text>
              )}
            </View>
          )}

          {/* Empty State */}
          {annualData.totalAmount === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📊</Text>
              <Text style={styles.emptyTitle}>Nenhum gasto em {selectedYear}</Text>
              <Text style={styles.emptySubtitle}>
                Comece a registrar suas despesas para ver análises detalhadas!
              </Text>
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </Animated.View>
      </ScrollView>

      {/* Modal de Seleção de Ano */}
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
                style={styles.modalClose}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={availableYears}
              keyExtractor={(item) => item.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.yearItem,
                    selectedYear === item && styles.yearItemSelected
                  ]}
                  onPress={() => {
                    setSelectedYear(item);
                    setYearModalVisible(false);
                  }}
                >
                  <Text style={[
                    styles.yearItemText,
                    selectedYear === item && styles.yearItemTextSelected
                  ]}>
                    {item}
                  </Text>
                  {selectedYear === item && (
                    <Text style={styles.yearCheckmark}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
              style={styles.yearList}
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
    backgroundColor: '#F9FAFB',
  },

  // Header
  header: {
    backgroundColor: '#6366F1',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 30,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  headerPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#5A5FC7',
    opacity: 0.1,
  },
  headerContent: {
    paddingHorizontal: 24,
    position: 'relative',
    zIndex: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  yearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  yearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 6,
  },
  yearButtonIcon: {
    fontSize: 12,
    color: '#FFFFFF',
  },

  // Total Container
  totalContainer: {
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  totalStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalStat: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  totalStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  totalStatLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  totalStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },

  // Content
  content: {
    flex: 1,
  },

  // Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 16,
  },
  metricCard: {
    width: (screenWidth - 48) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderTopWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  metricIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricIcon: {
    fontSize: 24,
  },
  metricTitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  metricSubtitle: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },

  // Chart Section
  chartSection: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  chart: {
    borderRadius: 8,
  },
  monthlyValues: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  monthValue: {
    alignItems: 'center',
    marginRight: 20,
  },
  monthValueLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  monthValueAmount: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '600',
  },
  monthValueZero: {
    color: '#9CA3AF',
  },
  pieChartLegend: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 12,
  },
  legendText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  legendPercent: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
    marginRight: 12,
  },
  legendValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '700',
  },
  legendOthers: {
    opacity: 0.8,
  },
  legendTotal: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  legendTotalText: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '700',
  },
  legendTotalValue: {
    fontSize: 16,
    color: '#6366F1',
    fontWeight: '800',
  },

  // Categories Section
  categoriesSection: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  categoriesList: {
    gap: 12,
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  categoryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryEmoji: {
    fontSize: 24,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  categoryRight: {
    alignItems: 'flex-end',
  },
  categoryRank: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  categoryAmount: {
    fontSize: 20,
    fontWeight: '700',
  },
  categoryStats: {
    flexDirection: 'row',
  },
  categoryStatInline: {
    fontSize: 12,
    color: '#6B7280',
  },
  categoryProgressBar: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  categoryProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  viewAllButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },

  // Insight Card
  insightCard: {
    marginHorizontal: 24,
    marginTop: 32,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  insightIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  insightTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#92400E',
  },
  insightText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
    marginBottom: 8,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 48,
    marginTop: 48,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
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
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalClose: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  modalCloseText: {
    fontSize: 16,
    color: '#6B7280',
  },
  yearList: {
    padding: 16,
  },
  yearItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 8,
  },
  yearItemSelected: {
    backgroundColor: '#EEF2FF',
  },
  yearItemText: {
    fontSize: 18,
    color: '#374151',
  },
  yearItemTextSelected: {
    fontWeight: '700',
    color: '#6366F1',
  },
  yearCheckmark: {
    fontSize: 18,
    color: '#6366F1',
    fontWeight: '700',
  },

  // Others
  bottomSpacer: {
    height: 40,
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
});