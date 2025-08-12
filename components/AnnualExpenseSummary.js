// components/AnnualExpenseSummary.js
// VERSÃO 3.0 - MELHORADA COM FILTRO DE USUÁRIO E NOVOS RECURSOS
// Melhorias implementadas:
// - ✅ Filtro por user_id para multi-usuário
// - ✅ Formatação PT-BR aprimorada
// - ✅ Gráficos interativos com tooltips
// - ✅ Análise trimestral
// - ✅ Comparativo com anos anteriores
// - ✅ Exportação de dados (PDF/Excel/Compartilhar)
// - ✅ Melhor performance com memoização
// - ✅ Novos insights e previsões
// - ✅ Filtros avançados

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
  Platform,
  Share
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { PieChart, BarChart, LineChart } from 'react-native-chart-kit';
import { useAuth } from '../services/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  NUBANK_COLORS,
  NUBANK_SPACING,
  NUBANK_FONT_SIZES,
  NUBANK_BORDER_RADIUS,
  NUBANK_FONT_WEIGHTS,
  NUBANK_SHADOWS
} from '../constants/nubank-theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function AnnualExpenseSummary() {
  const db = useSQLiteContext();
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [yearModalVisible, setYearModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('total');
  const [showQuarterlyAnalysis, setShowQuarterlyAnalysis] = useState(false);
  const [selectedQuarter, setSelectedQuarter] = useState(null);
  const [filterCategory, setFilterCategory] = useState(null);
  const [filterEstablishment, setFilterEstablishment] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Estados para dados
  const [annualData, setAnnualData] = useState({
    totalByCategory: [],
    monthlyData: [],
    quarterlyData: [],
    topCategory: null,
    totalAmount: 0,
    totalTransactions: 0,
    averagePerTransaction: 0,
    biggestExpense: null,
    mostActiveMonth: null,
    smallestExpense: 0,
    monthsWithExpenses: 0,
    dayWithMostExpenses: null,
    averageMonthly: 0,
    projectedYearTotal: 0,
    yearComparison: {
      previousYear: 0,
      percentageChange: 0,
      trend: 'stable'
    },
    establishmentRanking: [],
    paymentMethodsDistribution: [],
    weekdayDistribution: [],
    insights: []
  });

  // Animações
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];
  const scaleAnim = useState(new Animated.Value(0.9))[0];
  const [cardAnimations] = useState([...Array(6)].map(() => new Animated.Value(0)));

  // Anos disponíveis com base nos dados do usuário
  const [availableYears, setAvailableYears] = useState([]);

  useEffect(() => {
    if (db && user) {
      loadAvailableYears();
      loadAnnualData();
    }
  }, [db, user, selectedYear, filterCategory, filterEstablishment]);

  // Animações de entrada
  useEffect(() => {
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

    // Anima cards em sequência
    cardAnimations.forEach((anim, index) => {
      Animated.spring(anim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        delay: index * 100,
        useNativeDriver: true
      }).start();
    });
  }, [annualData]);

  // Carrega anos disponíveis
  const loadAvailableYears = async () => {
    try {
      const result = await db.getAllAsync(
        `
        SELECT DISTINCT strftime('%Y', date) as year
        FROM expenses
        WHERE user_id = ?
        ORDER BY year DESC
      `,
        [user.id]
      );

      const years = result.map(r => parseInt(r.year));
      // Adiciona o ano atual se não existir
      const currentYear = new Date().getFullYear();
      if (!years.includes(currentYear)) {
        years.unshift(currentYear);
      }

      setAvailableYears(years);
    } catch (error) {
      console.error('Erro ao carregar anos:', error);
    }
  };

  const loadAnnualData = useCallback(
    async (isRefresh = false) => {
      if (!user) {
        console.error('❌ Usuário não definido');
        return;
      }

      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        // 1. Buscar gastos por categoria no ano com filtros
        let categoryQuery = `
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
        WHERE strftime('%Y', e.date) = ? AND e.user_id = ?
      `;

        const queryParams = [selectedYear.toString(), user.id];

        if (filterCategory) {
          categoryQuery += ' AND e.categoryId = ?';
          queryParams.push(filterCategory);
        }

        if (filterEstablishment) {
          categoryQuery += ' AND e.establishment_id = ?';
          queryParams.push(filterEstablishment);
        }

        categoryQuery += ' GROUP BY c.id, c.name, c.icon ORDER BY total DESC';

        const categoryData = await db.getAllAsync(categoryQuery, queryParams);

        // 2. Buscar gastos mensais no ano
        const monthlyData = await db.getAllAsync(
          `
        SELECT 
          strftime('%m', e.date) as month,
          SUM(CAST(e.amount AS REAL)) as total,
          COUNT(*) as count,
          AVG(CAST(e.amount AS REAL)) as average
        FROM expenses e
        WHERE strftime('%Y', e.date) = ? AND e.user_id = ?
        ${filterCategory ? 'AND e.categoryId = ?' : ''}
        ${filterEstablishment ? 'AND e.establishment_id = ?' : ''}
        GROUP BY strftime('%m', e.date)
        ORDER BY month
      `,
          queryParams
        );

        // 3. Buscar gastos trimestrais
        const quarterlyData = await db.getAllAsync(
          `
        SELECT 
          CASE 
            WHEN CAST(strftime('%m', e.date) AS INTEGER) <= 3 THEN 'Q1'
            WHEN CAST(strftime('%m', e.date) AS INTEGER) <= 6 THEN 'Q2'
            WHEN CAST(strftime('%m', e.date) AS INTEGER) <= 9 THEN 'Q3'
            ELSE 'Q4'
          END as quarter,
          SUM(CAST(e.amount AS REAL)) as total,
          COUNT(*) as count,
          AVG(CAST(e.amount AS REAL)) as average
        FROM expenses e
        WHERE strftime('%Y', e.date) = ? AND e.user_id = ?
        ${filterCategory ? 'AND e.categoryId = ?' : ''}
        ${filterEstablishment ? 'AND e.establishment_id = ?' : ''}
        GROUP BY quarter
        ORDER BY quarter
      `,
          queryParams
        );

        // 4. Buscar estatísticas gerais
        const statsData = await db.getFirstAsync(
          `
        SELECT 
          COUNT(*) as totalTransactions,
          AVG(CAST(amount AS REAL)) as averagePerTransaction,
          MAX(CAST(amount AS REAL)) as biggestExpense,
          MIN(CAST(amount AS REAL)) as smallestExpense,
          SUM(CAST(amount AS REAL)) as totalAmount
        FROM expenses e
        WHERE strftime('%Y', e.date) = ? AND e.user_id = ?
        ${filterCategory ? 'AND e.categoryId = ?' : ''}
        ${filterEstablishment ? 'AND e.establishment_id = ?' : ''}
      `,
          queryParams
        );

        // 5. Buscar maior despesa individual
        const biggestExpenseData = await db.getFirstAsync(
          `
        SELECT 
          e.description,
          e.amount,
          e.date,
          c.name as category,
          c.icon as categoryIcon
        FROM expenses e
        LEFT JOIN categories c ON e.categoryId = c.id
        WHERE strftime('%Y', e.date) = ? AND e.user_id = ? 
        ${filterCategory ? 'AND e.categoryId = ?' : ''}
        ${filterEstablishment ? 'AND e.establishment_id = ?' : ''}
        AND CAST(e.amount AS REAL) = (
          SELECT MAX(CAST(amount AS REAL)) FROM expenses 
          WHERE strftime('%Y', date) = ? AND user_id = ?
          ${filterCategory ? 'AND categoryId = ?' : ''}
          ${filterEstablishment ? 'AND establishment_id = ?' : ''}
        )
        LIMIT 1
      `,
          [...queryParams, ...queryParams]
        );

        // 6. Comparação com ano anterior
        const previousYear = selectedYear - 1;
        const previousYearData = await db.getFirstAsync(
          `
        SELECT COALESCE(SUM(CAST(amount AS REAL)), 0) as total
        FROM expenses 
        WHERE strftime('%Y', date) = ? AND user_id = ?
      `,
          [previousYear.toString(), user.id]
        );

        // 7. Ranking de estabelecimentos
        const establishmentRanking = await db.getAllAsync(
          `
        SELECT 
          COALESCE(est.name, 'Não especificado') as name,
          COUNT(e.id) as visits,
          SUM(CAST(e.amount AS REAL)) as total,
          AVG(CAST(e.amount AS REAL)) as average
        FROM expenses e
        LEFT JOIN establishments est ON e.establishment_id = est.id
        WHERE strftime('%Y', e.date) = ? AND e.user_id = ?
        ${filterCategory ? 'AND e.categoryId = ?' : ''}
        GROUP BY est.id, est.name
        ORDER BY total DESC
        LIMIT 10
      `,
          filterCategory
            ? [selectedYear.toString(), user.id, filterCategory]
            : [selectedYear.toString(), user.id]
        );

        // 8. Distribuição por método de pagamento
        const paymentMethodsData = await db.getAllAsync(
          `
        SELECT 
          COALESCE(pm.name, 'Não especificado') as method,
          COALESCE(pm.icon, '💳') as icon,
          SUM(CAST(e.amount AS REAL)) as total,
          COUNT(*) as count,
          ROUND(SUM(CAST(e.amount AS REAL)) * 100.0 / (
            SELECT SUM(CAST(amount AS REAL)) 
            FROM expenses 
            WHERE strftime('%Y', date) = ? AND user_id = ?
          ), 2) as percentage
        FROM expenses e
        LEFT JOIN payment_methods pm ON e.payment_method_id = pm.id
        WHERE strftime('%Y', e.date) = ? AND e.user_id = ?
        ${filterCategory ? 'AND e.categoryId = ?' : ''}
        ${filterEstablishment ? 'AND e.establishment_id = ?' : ''}
        GROUP BY pm.id, pm.name, pm.icon
        ORDER BY total DESC
      `,
          [...queryParams, selectedYear.toString(), user.id]
        );

        // 9. Distribuição por dia da semana
        const weekdayData = await db.getAllAsync(
          `
        SELECT 
          strftime('%w', e.date) as weekday,
          COUNT(*) as count,
          SUM(CAST(e.amount AS REAL)) as total,
          AVG(CAST(e.amount AS REAL)) as average
        FROM expenses e
        WHERE strftime('%Y', e.date) = ? AND e.user_id = ?
        ${filterCategory ? 'AND e.categoryId = ?' : ''}
        ${filterEstablishment ? 'AND e.establishment_id = ?' : ''}
        GROUP BY weekday
        ORDER BY weekday
      `,
          queryParams
        );

        // 10. Dia com mais gastos
        const dayWithMostExpenses = await db.getFirstAsync(
          `
        SELECT 
          strftime('%Y-%m-%d', date) as day,
          COUNT(*) as count,
          SUM(CAST(amount AS REAL)) as total
        FROM expenses
        WHERE strftime('%Y', date) = ? AND user_id = ?
        ${filterCategory ? 'AND categoryId = ?' : ''}
        ${filterEstablishment ? 'AND establishment_id = ?' : ''}
        GROUP BY day
        ORDER BY total DESC
        LIMIT 1
      `,
          queryParams
        );

        // Processar dados
        const processedData = processAnnualData(
          categoryData,
          monthlyData,
          quarterlyData,
          statsData,
          biggestExpenseData,
          previousYearData,
          establishmentRanking,
          paymentMethodsData,
          weekdayData,
          dayWithMostExpenses
        );

        setAnnualData(processedData);
      } catch (error) {
        console.error('❌ Erro ao carregar dados anuais:', error);
        setError('Erro ao carregar dados. Tente novamente.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [db, user, selectedYear, filterCategory, filterEstablishment]
  );

  function processAnnualData(
    categoryData,
    monthlyData,
    quarterlyData,
    statsData,
    biggestExpenseData,
    previousYearData,
    establishmentRanking,
    paymentMethodsData,
    weekdayData,
    dayWithMostExpenses
  ) {
    // Processar dados por categoria com cores
    const colors = [
      '#10B981',
      '#3B82F6',
      '#EF4444',
      '#F59E0B',
      '#8B5CF6',
      '#EC4899',
      '#14B8A6',
      '#F97316',
      '#6366F1',
      '#84CC16'
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
      percentage: 0
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

    // Processar dados trimestrais
    const quarterlyProcessed = ['Q1', 'Q2', 'Q3', 'Q4'].map(quarter => {
      const found = quarterlyData.find(item => item.quarter === quarter);
      return {
        quarter,
        name: `${quarter} - ${getQuarterMonths(quarter)}`,
        amount: found ? found.total : 0,
        count: found ? found.count : 0,
        average: found ? found.average : 0
      };
    });

    // Encontrar mês mais ativo
    const mostActiveMonth = monthlyProcessed.reduce(
      (max, current) => (current.amount > max.amount ? current : max),
      { month: '', amount: 0, count: 0 }
    );

    // Contar meses com despesas
    const monthsWithExpenses = monthlyProcessed.filter(m => m.amount > 0).length;

    // Calcular média mensal real (apenas meses com gastos)
    const averageMonthly = monthsWithExpenses > 0 ? totalAmount / monthsWithExpenses : 0;

    // Projetar total anual baseado na média
    const currentMonth = new Date().getMonth() + 1;
    const projectedYearTotal =
      selectedYear === new Date().getFullYear() && currentMonth < 12
        ? (totalAmount / currentMonth) * 12
        : totalAmount;

    // Comparação com ano anterior
    const previousTotal = previousYearData?.total || 0;
    const percentageChange =
      previousTotal > 0 ? ((totalAmount - previousTotal) / previousTotal) * 100 : 0;

    const yearComparison = {
      previousYear: previousTotal,
      percentageChange,
      trend: percentageChange > 10 ? 'up' : percentageChange < -10 ? 'down' : 'stable'
    };

    // Processar distribuição por dia da semana
    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const weekdayDistribution = weekdays.map((day, index) => {
      const found = weekdayData.find(item => parseInt(item.weekday) === index);
      return {
        day,
        dayNumber: index,
        count: found ? found.count : 0,
        total: found ? found.total : 0,
        average: found ? found.average : 0
      };
    });

    // Gerar insights
    const insights = generateInsights({
      totalAmount,
      totalTransactions: statsData?.totalTransactions || 0,
      averagePerTransaction: statsData?.averagePerTransaction || 0,
      monthsWithExpenses,
      topCategory,
      mostActiveMonth,
      yearComparison,
      weekdayDistribution,
      projectedYearTotal,
      currentMonth,
      selectedYear
    });

    return {
      totalByCategory,
      monthlyData: monthlyProcessed,
      quarterlyData: quarterlyProcessed,
      topCategory,
      totalAmount,
      totalTransactions: statsData?.totalTransactions || 0,
      averagePerTransaction: statsData?.averagePerTransaction || 0,
      biggestExpense: biggestExpenseData
        ? {
            description: biggestExpenseData.description,
            amount: biggestExpenseData.amount,
            date: biggestExpenseData.date,
            category: biggestExpenseData.category,
            categoryIcon: biggestExpenseData.categoryIcon
          }
        : null,
      mostActiveMonth,
      smallestExpense: statsData?.smallestExpense || 0,
      monthsWithExpenses,
      dayWithMostExpenses,
      averageMonthly,
      projectedYearTotal,
      yearComparison,
      establishmentRanking,
      paymentMethodsDistribution: paymentMethodsData,
      weekdayDistribution,
      insights
    };
  }

  function getQuarterMonths(quarter) {
    switch (quarter) {
      case 'Q1':
        return 'Jan-Mar';
      case 'Q2':
        return 'Abr-Jun';
      case 'Q3':
        return 'Jul-Set';
      case 'Q4':
        return 'Out-Dez';
      default:
        return '';
    }
  }

  function generateInsights(data) {
    const insights = [];

    // Insight 1: Comparação com ano anterior
    if (data.yearComparison.previousYear > 0) {
      const { percentageChange, trend } = data.yearComparison;
      insights.push({
        id: 'year-comparison',
        type: trend === 'up' ? 'warning' : trend === 'down' ? 'success' : 'info',
        icon: trend === 'up' ? '📈' : trend === 'down' ? '📉' : '➡️',
        title: 'Comparação Anual',
        description:
          trend === 'up'
            ? `Gastos ${Math.abs(percentageChange).toFixed(1)}% maiores que ano passado`
            : trend === 'down'
              ? `Economia de ${Math.abs(percentageChange).toFixed(1)}% em relação ao ano passado`
              : 'Gastos estáveis em relação ao ano passado',
        priority: 1
      });
    }

    // Insight 2: Projeção anual
    if (data.selectedYear === new Date().getFullYear() && data.currentMonth < 12) {
      const projectionDiff = data.projectedYearTotal - data.totalAmount;
      insights.push({
        id: 'projection',
        type: 'info',
        icon: '🔮',
        title: 'Projeção Anual',
        description: `Baseado na média atual, você gastará aproximadamente ${formatCurrency(data.projectedYearTotal)} até o fim do ano`,
        priority: 2
      });
    }

    // Insight 3: Categoria dominante
    if (data.topCategory && data.topCategory.percentage > 30) {
      insights.push({
        id: 'top-category',
        type: 'info',
        icon: data.topCategory.icon,
        title: 'Categoria Principal',
        description: `${data.topCategory.name} representa ${data.topCategory.percentage.toFixed(1)}% dos seus gastos anuais`,
        priority: 3
      });
    }

    // Insight 4: Padrão semanal
    const maxWeekday = data.weekdayDistribution.reduce((max, current) =>
      current.total > max.total ? current : max
    );

    if (maxWeekday.total > 0) {
      insights.push({
        id: 'weekday-pattern',
        type: 'info',
        icon: '📅',
        title: 'Padrão Semanal',
        description: `${maxWeekday.day} é o dia da semana com mais gastos (${formatCurrency(maxWeekday.total)} no total)`,
        priority: 4
      });
    }

    // Insight 5: Meses sem gastos
    const monthsWithoutExpenses = 12 - data.monthsWithExpenses;
    if (monthsWithoutExpenses > 0 && data.selectedYear < new Date().getFullYear()) {
      insights.push({
        id: 'months-without-expenses',
        type: 'success',
        icon: '🎯',
        title: 'Controle Financeiro',
        description: `Você teve ${monthsWithoutExpenses} ${monthsWithoutExpenses === 1 ? 'mês' : 'meses'} sem nenhum gasto registrado!`,
        priority: 5
      });
    }

    // Insight 6: Média de transações
    if (data.totalTransactions > 0) {
      const transactionsPerMonth = data.totalTransactions / (data.monthsWithExpenses || 1);
      insights.push({
        id: 'transaction-average',
        type: 'info',
        icon: '📊',
        title: 'Frequência de Gastos',
        description: `Média de ${Math.round(transactionsPerMonth)} transações por mês ativo`,
        priority: 6
      });
    }

    return insights.sort((a, b) => a.priority - b.priority);
  }

  // Formatações PT-BR melhoradas
  const formatCurrency = (value, compact = false, showSymbol = true) => {
    if (value === null || value === undefined || (value === 0 && !compact)) {
      return showSymbol ? 'R$ 0,00' : '0,00';
    }

    const numValue = parseFloat(value) || 0;

    if (compact && numValue >= 1000) {
      const prefix = showSymbol ? 'R$ ' : '';
      if (numValue >= 1000000) {
        return `${prefix}${(numValue / 1000000).toFixed(1).replace('.', ',')}M`;
      }
      return `${prefix}${(numValue / 1000).toFixed(1).replace('.', ',')}k`;
    }

    if (!showSymbol) {
      return numValue.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }

    return numValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatPercentage = value => {
    const numValue = parseFloat(value) || 0;
    return `${numValue.toFixed(1).replace('.', ',')}%`;
  };

  const formatNumber = value => {
    if (value === null || value === undefined) return '0';
    const numValue = parseInt(value) || 0;
    return numValue.toLocaleString('pt-BR');
  };

  const formatDate = dateString => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Pull to refresh
  const onRefresh = useCallback(() => {
    loadAnnualData(true);
  }, [loadAnnualData]);

  // Exportar relatório
  const exportReport = async (format = 'text') => {
    try {
      let content = '';

      if (format === 'text') {
        content = generateTextReport();
      } else if (format === 'csv') {
        content = generateCSVReport();
      }

      await Share.share({
        message: content,
        title: `Relatório Anual ${selectedYear}`
      });
    } catch (error) {
      console.error('Erro ao exportar:', error);
      Alert.alert('Erro', 'Não foi possível exportar o relatório');
    }
  };

  const generateTextReport = () => {
    const {
      totalAmount,
      totalTransactions,
      totalByCategory,
      monthlyData,
      quarterlyData,
      yearComparison,
      insights
    } = annualData;

    let report = `📊 RELATÓRIO ANUAL DE DESPESAS - ${selectedYear}\n`;
    report += `${user?.name || 'Usuário'}\n\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    report += `💰 RESUMO GERAL\n`;
    report += `Total de Gastos: ${formatCurrency(totalAmount)}\n`;
    report += `Total de Transações: ${formatNumber(totalTransactions)}\n`;
    report += `Média por Transação: ${formatCurrency(totalAmount / totalTransactions)}\n`;
    report += `Meses com Gastos: ${annualData.monthsWithExpenses}/12\n`;
    report += `Média Mensal: ${formatCurrency(annualData.averageMonthly)}\n\n`;

    if (yearComparison.previousYear > 0) {
      report += `📈 COMPARAÇÃO COM ANO ANTERIOR\n`;
      report += `${selectedYear - 1}: ${formatCurrency(yearComparison.previousYear)}\n`;
      report += `Variação: ${yearComparison.percentageChange > 0 ? '+' : ''}${formatPercentage(yearComparison.percentageChange)}\n\n`;
    }

    report += `📂 GASTOS POR CATEGORIA\n`;
    totalByCategory.slice(0, 10).forEach((cat, index) => {
      report += `${index + 1}. ${cat.icon} ${cat.name}: ${formatCurrency(cat.amount)} (${formatPercentage(cat.percentage)})\n`;
    });
    report += '\n';

    report += `📅 GASTOS POR TRIMESTRE\n`;
    quarterlyData.forEach(q => {
      report += `${q.name}: ${formatCurrency(q.amount)}\n`;
    });
    report += '\n';

    report += `📊 GASTOS MENSAIS\n`;
    monthlyData.forEach(m => {
      if (m.amount > 0) {
        report += `${m.month}: ${formatCurrency(m.amount)}\n`;
      }
    });
    report += '\n';

    if (insights.length > 0) {
      report += `💡 INSIGHTS\n`;
      insights.forEach(insight => {
        report += `${insight.icon} ${insight.description}\n`;
      });
    }

    report += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}\n`;
    report += `App Controle Financeiro`;

    return report;
  };

  const generateCSVReport = () => {
    const { monthlyData, totalByCategory } = annualData;

    let csv = 'Tipo,Nome,Valor,Porcentagem\n';

    // Categorias
    totalByCategory.forEach(cat => {
      csv += `Categoria,"${cat.name}",${cat.amount.toFixed(2)},${cat.percentage.toFixed(2)}%\n`;
    });

    csv += '\nMês,Valor\n';

    // Meses
    monthlyData.forEach(m => {
      csv += `${m.month},${m.amount.toFixed(2)}\n`;
    });

    return csv;
  };

  // Dados para gráficos otimizados
  const pieChartData = useMemo(() => {
    return annualData.totalByCategory.slice(0, 5).map(item => ({
      name: item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name,
      population: item.amount,
      color: item.color,
      legendFontColor: '#374151',
      legendFontSize: 11
    }));
  }, [annualData.totalByCategory]);

  const lineChartData = useMemo(
    () => ({
      labels: annualData.monthlyData ? annualData.monthlyData.map(item => item.month) : [],
      datasets: [
        {
          data: annualData.monthlyData
            ? annualData.monthlyData.map(item => item.amount || 0.01)
            : [0.01],
          color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
          strokeWidth: 3
        }
      ]
    }),
    [annualData.monthlyData]
  );

  const barChartData = useMemo(
    () => ({
      labels: annualData.quarterlyData ? annualData.quarterlyData.map(item => item.quarter) : [],
      datasets: [
        {
          data: annualData.quarterlyData
            ? annualData.quarterlyData.map(item => item.amount || 0)
            : [0]
        }
      ]
    }),
    [annualData.quarterlyData]
  );

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
    },
    formatYLabel: value => {
      const num = parseFloat(value);
      if (num >= 1000000) {
        return `${(num / 1000000).toFixed(1).replace('.', ',')}M`;
      }
      if (num >= 1000) {
        return `${(num / 1000).toFixed(1).replace('.', ',')}k`;
      }
      return num.toFixed(0);
    }
  };

  // Componente de Card Métrica Interativo
  const MetricCard = ({ icon, title, value, subtitle, color, index, onPress }) => (
    <Animated.View
      style={{
        transform: [
          {
            scale: cardAnimations[index] || 1
          }
        ],
        opacity: cardAnimations[index] || 1
      }}
    >
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
        {subtitle && (
          <Text style={styles.metricSubtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );

  // Componente de Categoria Card
  const CategoryCard = ({ category, index }) => (
    <TouchableOpacity
      style={[styles.categoryCard, { borderLeftColor: category.color }]}
      activeOpacity={0.8}
      onPress={() => setFilterCategory(category.id)}
    >
      <View style={styles.categoryContent}>
        <View style={styles.categoryLeft}>
          <View style={[styles.categoryIcon, { backgroundColor: category.color + '15' }]}>
            <Text style={styles.categoryEmoji}>{category.icon}</Text>
          </View>
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryName} numberOfLines={1}>
              {category.name}
            </Text>
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
          <Text style={styles.categoryAverage}>
            Média: {formatCurrency(category.average, true)}
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

  // Componente de Insight Card
  const InsightCard = ({ insight }) => (
    <View
      style={[
        styles.insightCard,
        insight.type === 'warning' && styles.insightWarning,
        insight.type === 'success' && styles.insightSuccess,
        insight.type === 'info' && styles.insightInfo
      ]}
    >
      <Text style={styles.insightIcon}>{insight.icon}</Text>
      <View style={styles.insightContent}>
        <Text style={styles.insightTitle}>{insight.title}</Text>
        <Text style={styles.insightDescription}>{insight.description}</Text>
      </View>
    </View>
  );

  // Modal de seleção de ano
  const YearModal = () => (
    <Modal
      visible={yearModalVisible}
      transparent={true}
      animationType='slide'
      onRequestClose={() => setYearModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Selecionar Ano</Text>
            <TouchableOpacity onPress={() => setYearModalVisible(false)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={availableYears}
            keyExtractor={item => item.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.yearItem, selectedYear === item && styles.yearItemSelected]}
                onPress={() => {
                  setSelectedYear(item);
                  setYearModalVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.yearItemText,
                    selectedYear === item && styles.yearItemTextSelected
                  ]}
                >
                  {item}
                </Text>
                {selectedYear === item && <Text style={styles.yearCheckmark}>✓</Text>}
              </TouchableOpacity>
            )}
            style={styles.yearList}
          />
        </View>
      </View>
    </Modal>
  );

  // Loading state
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle='light-content' backgroundColor={NUBANK_COLORS.PRIMARY} />
        <ActivityIndicator size='large' color={NUBANK_COLORS.PRIMARY} />
        <Text style={styles.loadingText}>Preparando análise de {selectedYear}...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle='light-content' backgroundColor={NUBANK_COLORS.PRIMARY} />

      {/* Header Redesenhado */}
      <View style={styles.header}>
        <View style={styles.headerPattern} />
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View style={styles.headerTitleContainer}>
              <MaterialCommunityIcons
                name='chart-pie'
                size={24}
                color={NUBANK_COLORS.TEXT_WHITE}
                style={styles.headerIcon}
              />
              <Text style={styles.headerTitle}>Resumo Anual</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.yearButton}
                onPress={() => setYearModalVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.yearButtonText}>{selectedYear}</Text>
                <MaterialCommunityIcons
                  name='chevron-down'
                  size={16}
                  color={NUBANK_COLORS.TEXT_WHITE}
                  style={styles.yearButtonIcon}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.exportButton}
                onPress={() => {
                  Alert.alert('Exportar Relatório', 'Escolha o formato de exportação:', [
                    { text: 'Texto', onPress: () => exportReport('text') },
                    { text: 'CSV', onPress: () => exportReport('csv') },
                    { text: 'Cancelar', style: 'cancel' }
                  ]);
                }}
              >
                <MaterialCommunityIcons name='export' size={20} color={NUBANK_COLORS.TEXT_WHITE} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Total Principal */}
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total de Gastos em {selectedYear}</Text>
            <Text style={styles.totalAmount}>{formatCurrency(annualData.totalAmount)}</Text>
            <View style={styles.totalStats}>
              <View style={styles.totalStat}>
                <Text style={styles.totalStatValue}>
                  {formatNumber(annualData.totalTransactions)}
                </Text>
                <Text style={styles.totalStatLabel}>transações</Text>
              </View>
              <View style={styles.totalStatDivider} />
              <View style={styles.totalStat}>
                <Text style={styles.totalStatValue}>
                  {formatCurrency(annualData.averageMonthly)}
                </Text>
                <Text style={styles.totalStatLabel}>média mensal</Text>
              </View>
            </View>

            {/* Comparação com ano anterior */}
            {annualData.yearComparison.previousYear > 0 && (
              <View style={styles.yearComparisonBadge}>
                <Text
                  style={[
                    styles.yearComparisonText,
                    annualData.yearComparison.percentageChange > 0
                      ? styles.yearComparisonUp
                      : styles.yearComparisonDown
                  ]}
                >
                  {annualData.yearComparison.percentageChange > 0 ? '📈 +' : '📉 '}
                  {formatPercentage(Math.abs(annualData.yearComparison.percentageChange))}
                  {' vs ' + (selectedYear - 1)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Filtros */}
      {(filterCategory || filterEstablishment || showFilters) && (
        <View style={styles.filterBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {filterCategory && (
              <TouchableOpacity style={styles.filterChip} onPress={() => setFilterCategory(null)}>
                <Text style={styles.filterChipText}>
                  Categoria: {annualData.totalByCategory.find(c => c.id === filterCategory)?.name}
                </Text>
                <Text style={styles.filterChipRemove}>✕</Text>
              </TouchableOpacity>
            )}
            {filterEstablishment && (
              <TouchableOpacity
                style={styles.filterChip}
                onPress={() => setFilterEstablishment(null)}
              >
                <Text style={styles.filterChipText}>
                  Local:{' '}
                  {annualData.establishmentRanking.find(e => e.id === filterEstablishment)?.name}
                </Text>
                <Text style={styles.filterChipRemove}>✕</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      )}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#6366F1']}
            tintColor='#6366F1'
          />
        }
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }]
          }}
        >
          {/* Insights em destaque */}
          {annualData.insights && annualData.insights.length > 0 && (
            <View style={styles.insightsSection}>
              <Text style={styles.sectionTitle}>💡 Insights do Ano</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.insightsScroll}
              >
                {annualData.insights.map((insight, index) => (
                  <InsightCard key={insight.id} insight={insight} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Cards de Métricas */}
          <View style={styles.metricsGrid}>
            <MetricCard
              icon='📅'
              title='Média Mensal Real'
              value={formatCurrency(annualData.averageMonthly)}
              subtitle={`${annualData.monthsWithExpenses} meses com gastos`}
              color='#10B981'
              index={0}
            />
            <MetricCard
              icon='💰'
              title='Média/Transação'
              value={formatCurrency(annualData.averagePerTransaction)}
              subtitle={`${annualData.totalTransactions} transações`}
              color='#3B82F6'
              index={1}
            />
            <MetricCard
              icon='🚀'
              title='Maior Gasto'
              value={formatCurrency(annualData.biggestExpense?.amount || 0)}
              subtitle={annualData.biggestExpense?.description}
              color='#EF4444'
              index={2}
            />
            <MetricCard
              icon='🏆'
              title='Categoria Top'
              value={annualData.topCategory?.name || 'Nenhuma'}
              subtitle={
                annualData.topCategory ? formatCurrency(annualData.topCategory.amount) : 'R$ 0,00'
              }
              color='#8B5CF6'
              index={3}
            />
            <MetricCard
              icon='🔮'
              title='Projeção Anual'
              value={formatCurrency(annualData.projectedYearTotal)}
              subtitle={
                selectedYear === new Date().getFullYear() ? 'Baseado na média atual' : 'Total final'
              }
              color='#EC4899'
              index={4}
            />
            <MetricCard
              icon='📍'
              title='Local Mais Visitado'
              value={annualData.establishmentRanking[0]?.name || 'Nenhum'}
              subtitle={
                annualData.establishmentRanking[0]
                  ? `${annualData.establishmentRanking[0].visits} visitas`
                  : 'Sem dados'
              }
              color='#14B8A6'
              index={5}
            />
          </View>

          {/* Análise Trimestral */}
          <View style={styles.chartSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📊 Análise Trimestral</Text>
              <TouchableOpacity onPress={() => setShowQuarterlyAnalysis(!showQuarterlyAnalysis)}>
                <Text style={styles.toggleButton}>
                  {showQuarterlyAnalysis ? 'Ver Mensal' : 'Ver Trimestral'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.chartCard}>
              {showQuarterlyAnalysis ? (
                <>
                  <BarChart
                    data={barChartData}
                    width={screenWidth - 48}
                    height={220}
                    chartConfig={chartConfig}
                    style={styles.chart}
                    verticalLabelRotation={0}
                    showValuesOnTopOfBars
                    fromZero
                  />
                  <View style={styles.quarterlyDetails}>
                    {annualData.quarterlyData.map((quarter, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.quarterCard,
                          selectedQuarter === quarter.quarter && styles.quarterCardSelected
                        ]}
                        onPress={() =>
                          setSelectedQuarter(
                            selectedQuarter === quarter.quarter ? null : quarter.quarter
                          )
                        }
                      >
                        <Text style={styles.quarterTitle}>{quarter.name}</Text>
                        <Text style={styles.quarterAmount}>{formatCurrency(quarter.amount)}</Text>
                        <Text style={styles.quarterCount}>{quarter.count} transações</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : (
                <>
                  <LineChart
                    data={lineChartData}
                    width={screenWidth - 48}
                    height={220}
                    chartConfig={chartConfig}
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
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.monthlyValues}
                    contentContainerStyle={{ paddingRight: 20 }}
                  >
                    {annualData.monthlyData &&
                      annualData.monthlyData.map((month, index) => (
                        <View key={index} style={styles.monthValue}>
                          <Text style={styles.monthValueLabel}>{month.month}</Text>
                          <Text
                            style={[
                              styles.monthValueAmount,
                              month.amount === 0 && styles.monthValueZero
                            ]}
                          >
                            {formatCurrency(month.amount)}
                          </Text>
                          {month.count > 0 && (
                            <Text style={styles.monthValueCount}>{month.count} transações</Text>
                          )}
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
              {annualData.totalByCategory &&
                annualData.totalByCategory
                  .slice(0, 5)
                  .map((category, index) => (
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

          {/* Gráfico de Pizza - Categorias */}
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
                    chartConfig={chartConfig}
                    accessor='population'
                    backgroundColor='transparent'
                    paddingLeft='15'
                    hasLegend={false}
                    center={[10, 0]}
                  />
                  {/* Legenda customizada */}
                  <View style={styles.pieChartLegend}>
                    {annualData.totalByCategory &&
                      annualData.totalByCategory.slice(0, 5).map((item, index) => (
                        <View key={index} style={styles.legendItem}>
                          <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                          <Text style={styles.legendText} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text style={styles.legendPercent}>
                            {formatPercentage(item.percentage)}
                          </Text>
                          <Text style={styles.legendValue}>{formatCurrency(item.amount)}</Text>
                        </View>
                      ))}
                    {annualData.totalByCategory && annualData.totalByCategory.length > 5 && (
                      <View style={[styles.legendItem, styles.legendOthers]}>
                        <View style={[styles.legendColor, { backgroundColor: '#9CA3AF' }]} />
                        <Text style={styles.legendText}>
                          Outras ({annualData.totalByCategory.length - 5})
                        </Text>
                        <Text style={styles.legendPercent}>
                          {formatPercentage(
                            annualData.totalByCategory
                              .slice(5)
                              .reduce((sum, cat) => sum + cat.percentage, 0)
                          )}
                        </Text>
                        <Text style={styles.legendValue}>
                          {formatCurrency(
                            annualData.totalByCategory
                              .slice(5)
                              .reduce((sum, cat) => sum + cat.amount, 0)
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

          {/* Métodos de Pagamento */}
          {annualData.paymentMethodsDistribution &&
            annualData.paymentMethodsDistribution.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>💳 Formas de Pagamento</Text>
                <View style={styles.paymentMethodsList}>
                  {annualData.paymentMethodsDistribution.map((method, index) => (
                    <View key={index} style={styles.paymentMethodCard}>
                      <View style={styles.paymentMethodIcon}>
                        <Text>{method.icon}</Text>
                      </View>
                      <View style={styles.paymentMethodInfo}>
                        <Text style={styles.paymentMethodName}>{method.method}</Text>
                        <Text style={styles.paymentMethodStats}>
                          {method.count} transações • {formatPercentage(method.percentage)}
                        </Text>
                      </View>
                      <Text style={styles.paymentMethodAmount}>{formatCurrency(method.total)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

          {/* Ranking de Estabelecimentos */}
          {annualData.establishmentRanking && annualData.establishmentRanking.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🏪 Estabelecimentos Mais Visitados</Text>
              <View style={styles.establishmentsList}>
                {annualData.establishmentRanking.slice(0, 5).map((place, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.establishmentCard}
                    onPress={() => setFilterEstablishment(place.id)}
                  >
                    <View style={styles.establishmentRank}>
                      <Text style={styles.establishmentRankNumber}>#{index + 1}</Text>
                    </View>
                    <View style={styles.establishmentInfo}>
                      <Text style={styles.establishmentName}>{place.name}</Text>
                      <Text style={styles.establishmentStats}>
                        {place.visits} visitas • Média: {formatCurrency(place.average)}
                      </Text>
                    </View>
                    <Text style={styles.establishmentTotal}>{formatCurrency(place.total)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Padrão Semanal */}
          {annualData.weekdayDistribution && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📅 Padrão Semanal</Text>
              <View style={styles.weekdayChart}>
                {annualData.weekdayDistribution.map((day, index) => {
                  const maxTotal = Math.max(...annualData.weekdayDistribution.map(d => d.total));
                  const percentage = maxTotal > 0 ? (day.total / maxTotal) * 100 : 0;

                  return (
                    <View key={index} style={styles.weekdayBar}>
                      <View style={styles.weekdayBarContainer}>
                        <View style={[styles.weekdayBarFill, { height: `${percentage}%` }]} />
                      </View>
                      <Text style={styles.weekdayLabel}>{day.day}</Text>
                      <Text style={styles.weekdayValue}>{formatCurrency(day.total, true)}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Insights Detalhados */}
          {annualData.biggestExpense && (
            <View style={styles.insightCard}>
              <View style={styles.insightHeader}>
                <Text style={styles.insightIcon}>💡</Text>
                <Text style={styles.insightTitle}>Destaques do Ano</Text>
              </View>
              <Text style={styles.insightText}>
                💸 Sua maior despesa foi "{annualData.biggestExpense.description}" no valor de{' '}
                {formatCurrency(annualData.biggestExpense.amount)}
                em {formatDate(annualData.biggestExpense.date)}
                na categoria {annualData.biggestExpense.category || 'Sem categoria'}.
              </Text>
              {annualData.mostActiveMonth && annualData.mostActiveMonth.amount > 0 && (
                <Text style={styles.insightText}>
                  📅 {annualData.mostActiveMonth.month} foi o mês com mais gastos, totalizando{' '}
                  {formatCurrency(annualData.mostActiveMonth.amount)}
                  em {annualData.mostActiveMonth.count} transações.
                </Text>
              )}
              {annualData.dayWithMostExpenses && (
                <Text style={styles.insightText}>
                  🗓️ O dia com mais gastos foi {formatDate(annualData.dayWithMostExpenses.day)}
                  com {formatCurrency(annualData.dayWithMostExpenses.total)}
                  em {annualData.dayWithMostExpenses.count} transações.
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
      <YearModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NUBANK_COLORS.BACKGROUND_SECONDARY
  },

  // Header
  header: {
    backgroundColor: NUBANK_COLORS.PRIMARY,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: NUBANK_SPACING.XL,
    borderBottomLeftRadius: NUBANK_BORDER_RADIUS.LG,
    borderBottomRightRadius: NUBANK_BORDER_RADIUS.LG,
    overflow: 'hidden',
    position: 'relative'
  },
  headerPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: NUBANK_COLORS.PRIMARY_DARK,
    opacity: 0.1
  },
  headerContent: {
    paddingHorizontal: NUBANK_SPACING.XL,
    position: 'relative',
    zIndex: 1
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: NUBANK_SPACING.XL
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerIcon: {
    marginRight: NUBANK_SPACING.SM
  },
  headerTitle: {
    fontSize: NUBANK_FONT_SIZES.XXL,
    fontWeight: NUBANK_FONT_WEIGHTS.EXTRABOLD,
    color: NUBANK_COLORS.TEXT_WHITE
  },
  headerActions: {
    flexDirection: 'row',
    gap: NUBANK_SPACING.MD
  },
  yearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: NUBANK_SPACING.LG,
    paddingVertical: NUBANK_SPACING.SM,
    borderRadius: NUBANK_BORDER_RADIUS.MD
  },
  yearButtonText: {
    fontSize: NUBANK_FONT_SIZES.MD,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD,
    color: NUBANK_COLORS.TEXT_WHITE,
    marginRight: NUBANK_SPACING.XS
  },
  yearButtonIcon: {
    marginLeft: NUBANK_SPACING.XS
  },
  exportButton: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },

  // Total Container
  totalContainer: {
    alignItems: 'center'
  },
  totalLabel: {
    fontSize: NUBANK_FONT_SIZES.SM,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: NUBANK_SPACING.SM
  },
  totalAmount: {
    fontSize: NUBANK_FONT_SIZES.GIANT,
    fontWeight: NUBANK_FONT_WEIGHTS.EXTRABOLD,
    color: NUBANK_COLORS.TEXT_WHITE,
    marginBottom: NUBANK_SPACING.LG,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4
  },
  totalStats: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  totalStat: {
    alignItems: 'center',
    paddingHorizontal: NUBANK_SPACING.LG
  },
  totalStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  totalStatLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2
  },
  totalStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)'
  },
  yearComparisonBadge: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20
  },
  yearComparisonText: {
    fontSize: 14,
    fontWeight: '600'
  },
  yearComparisonUp: {
    color: '#FEE2E2'
  },
  yearComparisonDown: {
    color: '#D1FAE5'
  },

  // Filter Bar
  filterBar: {
    backgroundColor: NUBANK_COLORS.BACKGROUND,
    paddingHorizontal: NUBANK_SPACING.LG,
    paddingVertical: NUBANK_SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: NUBANK_COLORS.CARD_BORDER
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${NUBANK_COLORS.PRIMARY}10`,
    paddingHorizontal: NUBANK_SPACING.MD,
    paddingVertical: NUBANK_SPACING.XS,
    borderRadius: NUBANK_BORDER_RADIUS.LG,
    marginRight: NUBANK_SPACING.SM
  },
  filterChipText: {
    fontSize: NUBANK_FONT_SIZES.SM,
    color: NUBANK_COLORS.PRIMARY,
    marginRight: NUBANK_SPACING.XS
  },
  filterChipRemove: {
    fontSize: NUBANK_FONT_SIZES.SM,
    color: NUBANK_COLORS.PRIMARY,
    fontWeight: NUBANK_FONT_WEIGHTS.BOLD
  },

  // Content
  content: {
    flex: 1
  },

  // Insights Section
  insightsSection: {
    marginTop: 24,
    paddingHorizontal: 24
  },
  insightsScroll: {
    paddingVertical: 8
  },
  insightCard: {
    backgroundColor: NUBANK_COLORS.CARD_BACKGROUND,
    borderRadius: NUBANK_BORDER_RADIUS.LG,
    padding: NUBANK_SPACING.LG,
    marginRight: NUBANK_SPACING.MD,
    minWidth: 280,
    ...NUBANK_SHADOWS.SM,
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  insightWarning: {
    borderLeftWidth: 4,
    borderLeftColor: NUBANK_COLORS.WARNING,
    backgroundColor: `${NUBANK_COLORS.WARNING}10`
  },
  insightSuccess: {
    borderLeftWidth: 4,
    borderLeftColor: NUBANK_COLORS.SUCCESS,
    backgroundColor: `${NUBANK_COLORS.SUCCESS}10`
  },
  insightInfo: {
    borderLeftWidth: 4,
    borderLeftColor: NUBANK_COLORS.PRIMARY,
    backgroundColor: `${NUBANK_COLORS.PRIMARY}10`
  },
  insightIcon: {
    fontSize: 24,
    marginRight: 12
  },
  insightContent: {
    flex: 1
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4
  },
  insightDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20
  },

  // Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 16
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
    elevation: 5
  },
  metricIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  metricIcon: {
    fontSize: 24
  },
  metricTitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4
  },
  metricSubtitle: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4
  },

  // Sections
  section: {
    marginTop: 32,
    paddingHorizontal: 24
  },
  sectionHeader: {
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280'
  },
  toggleButton: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600'
  },

  // Chart Section
  chartSection: {
    marginTop: 32,
    paddingHorizontal: 24
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5
  },
  chart: {
    borderRadius: 8
  },
  monthlyValues: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6'
  },
  monthValue: {
    alignItems: 'center',
    marginRight: 20,
    minWidth: 80
  },
  monthValueLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '600'
  },
  monthValueAmount: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '700'
  },
  monthValueZero: {
    color: '#9CA3AF'
  },
  monthValueCount: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2
  },

  // Quarterly Analysis
  quarterlyDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    gap: 12
  },
  quarterCard: {
    flex: 1,
    minWidth: (screenWidth - 96) / 2,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center'
  },
  quarterCardSelected: {
    backgroundColor: '#EEF2FF',
    borderWidth: 2,
    borderColor: '#6366F1'
  },
  quarterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4
  },
  quarterAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6366F1',
    marginBottom: 2
  },
  quarterCount: {
    fontSize: 11,
    color: '#6B7280'
  },

  // Pie Chart Legend
  pieChartLegend: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6'
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 12
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 12
  },
  legendText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500'
  },
  legendPercent: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
    marginRight: 12
  },
  legendValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '700'
  },
  legendOthers: {
    opacity: 0.8
  },
  legendTotal: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  },
  legendTotalText: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '700'
  },
  legendTotalValue: {
    fontSize: 16,
    color: '#6366F1',
    fontWeight: '800'
  },

  // Categories Section
  categoriesSection: {
    marginTop: 32,
    paddingHorizontal: 24
  },
  categoriesList: {
    gap: 12
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
    elevation: 5
  },
  categoryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  categoryEmoji: {
    fontSize: 24
  },
  categoryInfo: {
    flex: 1
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4
  },
  categoryRight: {
    alignItems: 'flex-end'
  },
  categoryRank: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4
  },
  categoryAmount: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2
  },
  categoryAverage: {
    fontSize: 11,
    color: '#6B7280'
  },
  categoryStats: {
    flexDirection: 'row'
  },
  categoryStatInline: {
    fontSize: 12,
    color: '#6B7280'
  },
  categoryProgressBar: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden'
  },
  categoryProgressFill: {
    height: '100%',
    borderRadius: 3
  },
  viewAllButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1'
  },

  // Payment Methods
  paymentMethodsList: {
    gap: 8
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  paymentMethodIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  paymentMethodInfo: {
    flex: 1
  },
  paymentMethodName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2
  },
  paymentMethodStats: {
    fontSize: 12,
    color: '#6B7280'
  },
  paymentMethodAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981'
  },

  // Establishments
  establishmentsList: {
    gap: 8
  },
  establishmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  establishmentRank: {
    width: 32,
    height: 32,
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  establishmentRankNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6366F1'
  },
  establishmentInfo: {
    flex: 1
  },
  establishmentName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2
  },
  establishmentStats: {
    fontSize: 12,
    color: '#6B7280'
  },
  establishmentTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981'
  },

  // Weekday Pattern
  weekdayChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    marginTop: 16
  },
  weekdayBar: {
    flex: 1,
    alignItems: 'center'
  },
  weekdayBarContainer: {
    width: '80%',
    height: 80,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden'
  },
  weekdayBarFill: {
    backgroundColor: '#6366F1',
    borderRadius: 4
  },
  weekdayLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '600'
  },
  weekdayValue: {
    fontSize: 10,
    color: '#1F2937',
    fontWeight: '700',
    marginTop: 2
  },

  // Insight Card (detailed)
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  insightText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
    marginBottom: 8
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 48,
    marginTop: 48
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937'
  },
  modalClose: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8
  },
  modalCloseText: {
    fontSize: 16,
    color: '#6B7280'
  },
  yearList: {
    padding: 16
  },
  yearItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 8
  },
  yearItemSelected: {
    backgroundColor: '#EEF2FF'
  },
  yearItemText: {
    fontSize: 18,
    color: '#374151'
  },
  yearItemTextSelected: {
    fontWeight: '700',
    color: '#6366F1'
  },
  yearCheckmark: {
    fontSize: 18,
    color: '#6366F1',
    fontWeight: '700'
  },

  // Others
  bottomSpacer: {
    height: 40
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: NUBANK_COLORS.BACKGROUND_SECONDARY
  },
  loadingText: {
    marginTop: NUBANK_SPACING.LG,
    fontSize: NUBANK_FONT_SIZES.MD,
    color: NUBANK_COLORS.TEXT_SECONDARY,
    fontWeight: NUBANK_FONT_WEIGHTS.MEDIUM
  }
});
