// components/Dashboard.js - VERSÃO 2.0 COM MELHORIAS
// 🆕 NOVAS FUNCIONALIDADES:
// - Projeção de gastos até fim do mês
// - Contador de dias sem gastos com gamificação
// - Top 3 estabelecimentos mais visitados
// - Detecção de gastos atípicos
// - Análise de padrões semanais
// - Insights priorizados e inteligentes

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
    insights: [],
    // 🆕 NOVOS CAMPOS DE DADOS
    monthProjection: null,
    daysWithoutExpenses: null,
    topEstablishments: [],
    anomalousExpenses: [],
    weekdayAnalysis: null
  });

  // 🎬 ANIMAÇÕES CORRIGIDAS - Array fixo para 4 cards
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const cardAnimations = useRef([
    new Animated.Value(1),
    new Animated.Value(1),  
    new Animated.Value(1),
    new Animated.Value(1),
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

  // 🚀 FUNÇÃO PRINCIPAL DE CARREGAMENTO - ATUALIZADA
  const loadDashboardData = useCallback(async (isRefresh = false) => {
    if (!db) return;

    try {
      console.log('🔄 Carregando dashboard...', { isRefresh, isReady });
      
      if (isRefresh) {
        setIsRefreshing(true);
      } else if (!isReady) {
        setIsInitialLoading(true);
      }

      // 🆕 CHAMADAS PARALELAS INCLUINDO NOVAS FUNÇÕES
      const [
        todayData,
        weekData,
        monthData,
        yearData,
        categoryData,
        recentData,
        weeklyTrendData,
        previousMonthData,
        // 🆕 NOVAS CHAMADAS
        projectionData,
        daysWithoutData,
        topEstablishments,
        anomalousExpenses,
        weekdayAnalysis
      ] = await Promise.all([
        getTodayData(),
        getWeekData(),
        getMonthData(),
        getYearData(),
        getCategoryDistribution(),
        getRecentExpenses(),
        getWeeklyTrend(),
        getPreviousMonthData(),
        // 🆕 NOVAS FUNÇÕES
        getMonthProjection(),
        getDaysWithoutExpenses(),
        getTopEstablishments(),
        getAnomalousExpenses(),
        getWeekdayAnalysis()
      ]);

      // 🆕 GERA INSIGHTS APRIMORADOS
      const insights = generateEnhancedInsights({
        today: todayData,
        week: weekData,
        month: monthData,
        year: yearData,
        categories: categoryData,
        previousMonth: previousMonthData,
        projection: projectionData,
        daysWithout: daysWithoutData,
        anomalies: anomalousExpenses,
        weekday: weekdayAnalysis
      });

      // 🆕 ESTRUTURA DE DADOS EXPANDIDA
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
        insights,
        // 🆕 NOVOS DADOS
        monthProjection: projectionData,
        daysWithoutExpenses: daysWithoutData,
        topEstablishments: topEstablishments,
        anomalousExpenses: anomalousExpenses,
        weekdayAnalysis: weekdayAnalysis
      };

      setDashboardData(newData);

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

  // 🎬 ANIMAÇÕES PRINCIPAIS
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

    console.log('✅ Animações principais iniciadas');
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

  // 📊 FUNÇÕES DE DADOS EXISTENTES
  const getTodayData = async () => {
    const result = await db.getFirstAsync(`
      SELECT 
        COALESCE(SUM(CAST(amount AS REAL)), 0) as total,
        COUNT(*) as count
      FROM expenses 
      WHERE DATE(date) = DATE('now', 'localtime')
    `);
    
    if (!result || result.total === 0) {
      return { total: 127.50, count: 3 };
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
    
    if (!result || result.total === 0) {
      return { total: 856.40, count: 15 };
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
    
    if (!result || result.total === 0) {
      return { total: 2847.90, count: 47 };
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
    
    if (!result || result.total === 0) {
      return { total: 15420.65, count: 234 };
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
    
    if (!result || result.total === 0) {
      return { total: 2456.30 };
    }
    
    return result || { total: 0 };
  };

  // ========================================
  // 🆕 NOVAS FUNÇÕES DE DADOS
  // ========================================

  /**
   * 🎯 Calcula a projeção de gastos até o fim do mês
   */
  const getMonthProjection = async () => {
    try {
      const hoje = new Date();
      const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
      const diaAtual = hoje.getDate();
      
      const monthData = await db.getFirstAsync(`
        SELECT 
          COALESCE(SUM(CAST(amount AS REAL)), 0) as total,
          COUNT(DISTINCT DATE(date)) as dias_com_gastos
        FROM expenses 
        WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now', 'localtime')
      `);
      
      if (!monthData || monthData.total === 0) {
        return {
          projecao: 0,
          mediaDiaria: 0,
          diasRestantes: diasNoMes - diaAtual,
          percentualMes: (diaAtual / diasNoMes) * 100,
          totalAtual: 0
        };
      }
      
      const mediaDiaria = monthData.dias_com_gastos > 0 
        ? monthData.total / monthData.dias_com_gastos 
        : monthData.total / diaAtual;
      
      const diasRestantes = diasNoMes - diaAtual;
      const projecao = monthData.total + (mediaDiaria * diasRestantes);
      
      return {
        projecao,
        mediaDiaria,
        diasRestantes,
        percentualMes: (diaAtual / diasNoMes) * 100,
        totalAtual: monthData.total
      };
    } catch (error) {
      console.error('❌ Erro ao calcular projeção:', error);
      return { projecao: 0, mediaDiaria: 0, diasRestantes: 0, percentualMes: 0 };
    }
  };

  /**
   * 🏆 Calcula sequência de dias sem gastos
   */
  const getDaysWithoutExpenses = async () => {
    try {
      const result = await db.getAllAsync(`
        SELECT DISTINCT DATE(date) as data
        FROM expenses 
        WHERE DATE(date) >= DATE('now', '-30 days')
        ORDER BY date DESC
      `);
      
      if (!result || result.length === 0) {
        return { 
          diasConsecutivos: 30, 
          recorde: 30,
          ultimoGasto: null 
        };
      }
      
      const datasComGastos = new Set(result.map(r => r.data));
      
      let diasConsecutivos = 0;
      let recorde = 0;
      const hoje = new Date();
      
      for (let i = 0; i < 30; i++) {
        const data = new Date(hoje);
        data.setDate(data.getDate() - i);
        const dataStr = data.toISOString().split('T')[0];
        
        if (!datasComGastos.has(dataStr)) {
          diasConsecutivos++;
        } else {
          recorde = Math.max(recorde, diasConsecutivos);
          if (i === 0) diasConsecutivos = 0;
          break;
        }
      }
      
      return {
        diasConsecutivos,
        recorde: Math.max(recorde, diasConsecutivos),
        ultimoGasto: result[0]?.data || null
      };
    } catch (error) {
      console.error('❌ Erro ao calcular dias sem gastos:', error);
      return { diasConsecutivos: 0, recorde: 0, ultimoGasto: null };
    }
  };

  /**
   * 🏪 Busca top 3 estabelecimentos com mais gastos
   */
  const getTopEstablishments = async () => {
    try {
      const result = await db.getAllAsync(`
        SELECT 
          est.id,
          est.name,
          est.category,
          COUNT(e.id) as frequencia,
          SUM(CAST(e.amount AS REAL)) as total,
          AVG(CAST(e.amount AS REAL)) as ticket_medio,
          MAX(e.date) as ultima_visita
        FROM expenses e
        INNER JOIN establishments est ON e.establishment_id = est.id
        WHERE strftime('%Y-%m', e.date) = strftime('%Y-%m', 'now', 'localtime')
        GROUP BY est.id, est.name
        ORDER BY total DESC
        LIMIT 3
      `);
      
      if (!result || result.length === 0) {
        return [];
      }
      
      return result.map((item, index) => ({
        ...item,
        posicao: index + 1,
        emoji: index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'
      }));
    } catch (error) {
      console.error('❌ Erro ao buscar top estabelecimentos:', error);
      return [];
    }
  };

  /**
   * ⚠️ Detecta gastos atípicos (50% acima da média)
   */
  const getAnomalousExpenses = async () => {
    try {
      const averages = await db.getAllAsync(`
        SELECT 
          categoryId,
          c.name as category_name,
          c.icon as category_icon,
          AVG(CAST(e.amount AS REAL)) as media,
          MAX(CAST(e.amount AS REAL)) as maximo
        FROM expenses e
        LEFT JOIN categories c ON e.categoryId = c.id
        WHERE DATE(e.date) >= DATE('now', '-30 days')
        GROUP BY categoryId
      `);
      
      if (!averages || averages.length === 0) return [];
      
      const mediasPorCategoria = {};
      averages.forEach(avg => {
        mediasPorCategoria[avg.categoryId] = {
          media: avg.media,
          nome: avg.category_name,
          icon: avg.category_icon
        };
      });
      
      const recentExpenses = await db.getAllAsync(`
        SELECT 
          e.id,
          e.description,
          e.amount,
          e.categoryId,
          e.date
        FROM expenses e
        WHERE DATE(e.date) >= DATE('now', '-1 day')
        ORDER BY e.amount DESC
      `);
      
      const anomalias = [];
      recentExpenses.forEach(expense => {
        const catInfo = mediasPorCategoria[expense.categoryId];
        if (catInfo && expense.amount > catInfo.media * 1.5) {
          anomalias.push({
            ...expense,
            categoria: catInfo.nome,
            icon: catInfo.icon,
            media: catInfo.media,
            percentualAcima: ((expense.amount / catInfo.media - 1) * 100).toFixed(0)
          });
        }
      });
      
      return anomalias.slice(0, 3);
    } catch (error) {
      console.error('❌ Erro ao detectar anomalias:', error);
      return [];
    }
  };

  /**
   * 📅 Análise de gastos por dia da semana
   */
  const getWeekdayAnalysis = async () => {
    try {
      const result = await db.getAllAsync(`
        SELECT 
          CAST(strftime('%w', date) AS INTEGER) as dia_semana,
          COUNT(*) as transacoes,
          SUM(CAST(amount AS REAL)) as total,
          AVG(CAST(amount AS REAL)) as media
        FROM expenses 
        WHERE DATE(date) >= DATE('now', '-30 days')
        GROUP BY dia_semana
        ORDER BY total DESC
      `);
      
      if (!result || result.length === 0) return null;
      
      const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const dadosFormatados = result.map(r => ({
        ...r,
        nome: dias[r.dia_semana],
        isTop: false
      }));
      
      if (dadosFormatados.length > 0) {
        dadosFormatados[0].isTop = true;
      }
      
      return dadosFormatados;
    } catch (error) {
      console.error('❌ Erro na análise semanal:', error);
      return null;
    }
  };

  // 🆕 FUNÇÃO DE INSIGHTS APRIMORADA
  const generateEnhancedInsights = (data) => {
    const insights = [];

    // 🔴 PRIORIDADE 1: Alertas de gastos atípicos
    if (data.anomalies && data.anomalies.length > 0) {
      const maiorAnomalia = data.anomalies[0];
      insights.push({
        icon: '⚠️',
        type: 'warning',
        title: 'Gasto Atípico Detectado',
        message: `"${maiorAnomalia.description}" está ${maiorAnomalia.percentualAcima}% acima da média`,
        priority: 1
      });
    }

    // 🟡 PRIORIDADE 2: Projeção de fim de mês
    if (data.projection && data.projection.projecao > 0) {
      const projecaoFormatada = formatCurrency(data.projection.projecao);
      const percentualMes = data.projection.percentualMes;
      
      if (percentualMes < 50 && data.month.total > data.previousMonth.total * 0.5) {
        insights.push({
          icon: '📊',
          type: 'warning',
          title: 'Ritmo de Gastos Acelerado',
          message: `Projeção: ${projecaoFormatada} (${data.projection.diasRestantes} dias restantes)`,
          priority: 2
        });
      } else {
        insights.push({
          icon: '📈',
          type: 'info',
          title: 'Projeção do Mês',
          message: `Você deve gastar ${projecaoFormatada} até o fim do mês`,
          priority: 4
        });
      }
    }

    // 🟢 PRIORIDADE 3: Conquistas de economia
    if (data.daysWithout && data.daysWithout.diasConsecutivos >= 3) {
      insights.push({
        icon: '🏆',
        type: 'success',
        title: `${data.daysWithout.diasConsecutivos} Dias Economizando!`,
        message: data.daysWithout.diasConsecutivos >= 7 
          ? 'Uma semana inteira! Parabéns!' 
          : 'Continue assim, você está indo muito bem!',
        priority: 3
      });
    }

    // 🔵 PRIORIDADE 4: Análise de dia da semana
    if (data.weekday && data.weekday.length > 0) {
      const diaMaisCaro = data.weekday[0];
      const mediaGeral = data.weekday.reduce((sum, d) => sum + d.total, 0) / data.weekday.length;
      
      if (diaMaisCaro.total > mediaGeral * 1.4) {
        insights.push({
          icon: '📅',
          type: 'info',
          title: `${diaMaisCaro.nome} é seu dia mais caro`,
          message: `Você gasta ${formatPercentage(((diaMaisCaro.total / mediaGeral - 1) * 100))}% mais neste dia`,
          priority: 5
        });
      }
    }

    // 🟣 PRIORIDADE 5: Comparação mensal
    const monthChange = data.month.total - data.previousMonth.total;
    const monthChangePercent = data.previousMonth.total > 0 
      ? ((monthChange / data.previousMonth.total) * 100)
      : 0;

    if (Math.abs(monthChangePercent) > 20) {
      if (monthChange > 0) {
        insights.push({
          icon: '📈',
          type: 'warning',
          title: 'Gastos em Alta',
          message: `+${formatPercentage(monthChangePercent)}% vs mês passado`,
          priority: 6
        });
      } else {
        insights.push({
          icon: '📉',
          type: 'success',
          title: 'Excelente Economia!',
          message: `${formatPercentage(Math.abs(monthChangePercent))}% menos que mês passado`,
          priority: 6
        });
      }
    }

    return insights.sort((a, b) => a.priority - b.priority).slice(0, 5);
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

  const formatDateRelative = (dateString) => {
    try {
      console.log('🔍 Formatando data:', dateString);
      
      if (!dateString) {
        console.warn('⚠️ Data vazia recebida');
        return 'Data inválida';
      }

      let date;
      
      if (dateString.includes('T')) {
        date = new Date(dateString);
      } else {
        const parts = dateString.split(' ')[0];
        date = new Date(parts + 'T00:00:00.000Z');
      }
      
      if (isNaN(date.getTime())) {
        console.warn('⚠️ Data inválida:', dateString);
        return 'Data inválida';
      }
      
      const localDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const expenseDate = new Date(localDate);
      expenseDate.setHours(0, 0, 0, 0);
      
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

      if (diffDays === 0) {
        return 'Hoje';
      } else if (diffDays === 1) {
        return 'Ontem';
      } else if (diffDays > 1 && diffDays < 7) {
        return `${diffDays} dias atrás`;
      } else if (diffDays < 0) {
        return 'Hoje';
      } else {
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

  const safeNavigate = useCallback((screenName) => {
    try {
      if (navigation && isReady) {
        navigation.navigate(screenName);
      }
    } catch (error) {
      console.error('Erro na navegação:', error);
    }
  }, [navigation, isReady]);

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

  // 🎭 COMPONENTES EXISTENTES
  const StatCard = React.memo(({ icon, title, value, subtitle, color, index, onPress }) => {
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

  // ========================================
  // 🆕 NOVOS COMPONENTES
  // ========================================

  /**
   * 📊 Componente de Projeção Mensal
   */
  const MonthProjectionCard = React.memo(({ projection, monthTotal }) => {
    if (!projection || projection.projecao === 0) return null;
    
    const percentualGasto = projection.totalAtual > 0 && projection.projecao > 0
      ? (projection.totalAtual / projection.projecao) * 100
      : 0;
    
    return (
      <View style={styles.projectionCard}>
        <View style={styles.projectionHeader}>
          <Text style={styles.projectionTitle}>📊 Projeção do Mês</Text>
          <Text style={styles.projectionDays}>{projection.diasRestantes} dias restantes</Text>
        </View>
        
        <View style={styles.projectionValues}>
          <View style={styles.projectionCurrent}>
            <Text style={styles.projectionLabel}>Gasto atual</Text>
            <Text style={styles.projectionAmount}>{formatCurrency(projection.totalAtual)}</Text>
          </View>
          <View style={styles.projectionArrow}>
            <Text style={styles.projectionArrowText}>→</Text>
          </View>
          <View style={styles.projectionFinal}>
            <Text style={styles.projectionLabel}>Projeção final</Text>
            <Text style={[styles.projectionAmount, styles.projectionAmountHighlight]}>
              {formatCurrency(projection.projecao)}
            </Text>
          </View>
        </View>
        
        <View style={styles.projectionProgress}>
          <View style={styles.projectionProgressBar}>
            <View 
              style={[
                styles.projectionProgressFill,
                { 
                  width: `${Math.min(percentualGasto, 100)}%`,
                  backgroundColor: percentualGasto > 80 ? '#EF4444' : '#10B981'
                }
              ]} 
            />
          </View>
          <Text style={styles.projectionProgressText}>
            {percentualGasto.toFixed(0)}% do projetado
          </Text>
        </View>
        
        <View style={styles.projectionFooter}>
          <Text style={styles.projectionDaily}>
            💵 Média diária: {formatCurrency(projection.mediaDiaria)}
          </Text>
        </View>
      </View>
    );
  });

  /**
   * 🏆 Componente de Sequência de Economia
   */
  const EconomyStreakCard = React.memo(({ daysData }) => {
    if (!daysData) return null;
    
    const getMessage = () => {
      const dias = daysData.diasConsecutivos;
      if (dias === 0) return "Comece hoje sua sequência!";
      if (dias === 1) return "Primeiro dia economizando!";
      if (dias < 7) return `${dias} dias seguidos!`;
      if (dias < 30) return `${dias} dias! Incrível!`;
      return `${dias} dias! Você é uma lenda!`;
    };
    
    const getEmoji = () => {
      const dias = daysData.diasConsecutivos;
      if (dias === 0) return '🎯';
      if (dias < 3) return '⭐';
      if (dias < 7) return '🌟';
      if (dias < 14) return '🏆';
      if (dias < 30) return '👑';
      return '🏅';
    };
    
    return (
      <View style={[
        styles.economyCard,
        { backgroundColor: daysData.diasConsecutivos > 0 ? '#F0FDF4' : '#FEF3C7' }
      ]}>
        <View style={styles.economyHeader}>
          <Text style={styles.economyEmoji}>{getEmoji()}</Text>
          <View style={styles.economyContent}>
            <Text style={styles.economyTitle}>Sequência de Economia</Text>
            <Text style={[
              styles.economyDays,
              { color: daysData.diasConsecutivos > 0 ? '#166534' : '#92400E' }
            ]}>
              {getMessage()}
            </Text>
          </View>
        </View>
        
        {daysData.recorde > daysData.diasConsecutivos && (
          <View style={styles.economyRecord}>
            <Text style={styles.economyRecordText}>
              🏅 Recorde: {daysData.recorde} dias
            </Text>
          </View>
        )}
      </View>
    );
  });

  /**
   * 🏪 Componente de Top Estabelecimentos
   */
  const TopEstablishmentsCard = React.memo(({ establishments, onViewAll }) => {
    if (!establishments || establishments.length === 0) return null;
    
    return (
      <View style={styles.topEstablishmentsCard}>
        <View style={styles.topEstablishmentsHeader}>
          <Text style={styles.topEstablishmentsTitle}>🏪 Top Estabelecimentos</Text>
          <TouchableOpacity onPress={onViewAll}>
            <Text style={styles.viewAllText}>Ver todos →</Text>
          </TouchableOpacity>
        </View>
        
        {establishments.map((place, index) => (
          <View key={place.id} style={styles.establishmentItem}>
            <Text style={styles.establishmentRank}>{place.emoji}</Text>
            <View style={styles.establishmentInfo}>
              <Text style={styles.establishmentName} numberOfLines={1}>
                {place.name}
              </Text>
              <View style={styles.establishmentStats}>
                <Text style={styles.establishmentVisits}>
                  {place.frequencia} visita{place.frequencia !== 1 ? 's' : ''}
                </Text>
                <Text style={styles.establishmentAverage}>
                  Ticket: {formatCurrency(place.ticket_medio)}
                </Text>
              </View>
            </View>
            <Text style={styles.establishmentTotal}>
              {formatCurrency(place.total)}
            </Text>
          </View>
        ))}
      </View>
    );
  });

  /**
   * ⚠️ Componente de Alertas de Anomalias
   */
  const AnomalyAlertCard = React.memo(({ anomaly }) => {
    if (!anomaly) return null;
    
    return (
      <TouchableOpacity style={styles.anomalyCard} activeOpacity={0.8}>
        <View style={styles.anomalyIconContainer}>
          <Text style={styles.anomalyIcon}>⚠️</Text>
        </View>
        <View style={styles.anomalyContent}>
          <Text style={styles.anomalyTitle}>Gasto Atípico Detectado</Text>
          <Text style={styles.anomalyDescription} numberOfLines={1}>
            {anomaly.description}
          </Text>
          <View style={styles.anomalyDetails}>
            <Text style={styles.anomalyCategory}>
              {anomaly.icon} {anomaly.categoria}
            </Text>
            <Text style={styles.anomalyPercentage}>
              +{anomaly.percentualAcima}% da média
            </Text>
          </View>
          <View style={styles.anomalyComparison}>
            <Text style={styles.anomalyValue}>
              Valor: {formatCurrency(anomaly.amount)}
            </Text>
            <Text style={styles.anomalyAverage}>
              Média: {formatCurrency(anomaly.media)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  });

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
          
          {/* SEÇÃO DE CARDS EXISTENTES */}
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

          {/* 🆕 SEÇÃO DE PROJEÇÃO E ECONOMIA */}
          <View style={styles.section}>
            <View style={styles.projectionEconomyRow}>
              <MonthProjectionCard 
                projection={dashboardData.monthProjection}
                monthTotal={dashboardData.monthSpending}
              />
              
              <EconomyStreakCard 
                daysData={dashboardData.daysWithoutExpenses}
              />
            </View>
          </View>

          {/* 🆕 ALERTAS DE ANOMALIAS */}
          {dashboardData.anomalousExpenses && dashboardData.anomalousExpenses.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⚠️ Alertas</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.anomaliesScroll}
              >
                {dashboardData.anomalousExpenses.map((anomaly, index) => (
                  <AnomalyAlertCard key={anomaly.id} anomaly={anomaly} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* 🆕 TOP ESTABELECIMENTOS */}
          {dashboardData.topEstablishments && dashboardData.topEstablishments.length > 0 && (
            <View style={styles.section}>
              <TopEstablishmentsCard 
                establishments={dashboardData.topEstablishments}
                onViewAll={() => safeNavigate('Estabelecimentos')}
              />
            </View>
          )}

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

          {/* 🆕 INSIGHTS APRIMORADOS */}
          {dashboardData.insights.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💡 Insights Inteligentes</Text>
              <View style={styles.insightsContainer}>
                {dashboardData.insights.map((insight, index) => (
                  <InsightCard key={index} insight={insight} />
                ))}
                
                {/* 🆕 Card de Análise Semanal */}
                {dashboardData.weekdayAnalysis && dashboardData.weekdayAnalysis.length > 0 && (
                  <View style={[
                    styles.insightCard,
                    { backgroundColor: '#FEF3C7', borderLeftColor: '#F59E0B' }
                  ]}>
                    <View style={styles.insightHeader}>
                      <Text style={styles.insightIcon}>📅</Text>
                      <Text style={styles.insightTitle}>Padrão Semanal</Text>
                    </View>
                    <Text style={styles.insightMessage}>
                      {dashboardData.weekdayAnalysis[0].nome} é seu dia mais caro 
                      ({formatCurrency(dashboardData.weekdayAnalysis[0].total)})
                    </Text>
                  </View>
                )}
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
  
  header: {
    backgroundColor: '#6366F1',
    paddingTop: Platform.OS === 'ios' ? 40 : 18,
    paddingBottom: 6,
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
    paddingVertical: 2,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 4,
    paddingHorizontal: 8,
  },
  
  mainSummary: { 
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    width: '100%',
    paddingVertical: 0,
  },
  mainSummaryLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 2,
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  mainSummaryValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 3,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: -0.8,
    lineHeight: 30,
  },
  demoIndicator: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'center',
  },
  
  comparisonContainer: { 
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 280,
    maxWidth: '85%',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    marginTop: 0,
    alignSelf: 'center',
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  comparisonIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  comparisonText: { 
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  comparisonValue: { 
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 1,
  },
  comparisonDifference: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  
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
  viewAllText: { fontSize: 14, color: '#6366F1', fontWeight: '600' },
  
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

  // ========================================
  // 🆕 NOVOS ESTILOS
  // ========================================
  
  // Estilos para Projeção e Economia
  projectionEconomyRow: {
    flexDirection: 'column',
    gap: 12,
  },

  // 📊 Estilos do Card de Projeção
  projectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  projectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  projectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  projectionDays: {
    fontSize: 13,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  projectionValues: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  projectionCurrent: {
    flex: 1,
    alignItems: 'center',
  },
  projectionArrow: {
    paddingHorizontal: 16,
  },
  projectionArrowText: {
    fontSize: 20,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  projectionFinal: {
    flex: 1,
    alignItems: 'center',
  },
  projectionLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  projectionAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
  },
  projectionAmountHighlight: {
    color: '#6366F1',
    fontSize: 20,
  },
  projectionProgress: {
    marginBottom: 12,
  },
  projectionProgressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  projectionProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  projectionProgressText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  projectionFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  projectionDaily: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    textAlign: 'center',
  },

  // 🏆 Estilos do Card de Economia
  economyCard: {
    borderRadius: 12,
    padding: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  economyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  economyEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  economyContent: {
    flex: 1,
  },
  economyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  economyDays: {
    fontSize: 20,
    fontWeight: '700',
  },
  economyRecord: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#D1FAE5',
  },
  economyRecordText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
  },

  // 🏪 Estilos do Card de Top Estabelecimentos
  topEstablishmentsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  topEstablishmentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  topEstablishmentsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  establishmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  establishmentRank: {
    fontSize: 24,
    marginRight: 12,
    width: 32,
  },
  establishmentInfo: {
    flex: 1,
  },
  establishmentName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  establishmentStats: {
    flexDirection: 'row',
    gap: 12,
  },
  establishmentVisits: {
    fontSize: 12,
    color: '#6B7280',
  },
  establishmentAverage: {
    fontSize: 12,
    color: '#6B7280',
  },
  establishmentTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
  },

  // ⚠️ Estilos do Card de Anomalias
  anomaliesScroll: {
    marginTop: 8,
  },
  anomalyCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: screenWidth - 64,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  anomalyIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#FEE2E2',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  anomalyIcon: {
    fontSize: 24,
  },
  anomalyContent: {
    flex: 1,
  },
  anomalyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B91C1C',
    marginBottom: 4,
  },
  anomalyDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  anomalyDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  anomalyCategory: {
    fontSize: 13,
    color: '#6B7280',
  },
  anomalyPercentage: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '600',
  },
  anomalyComparison: {
    flexDirection: 'row',
    gap: 16,
  },
  anomalyValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  anomalyAverage: {
    fontSize: 14,
    color: '#6B7280',
  },
});