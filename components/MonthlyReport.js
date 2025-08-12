// components/MonthlyReport.js - VERSÃO CORRIGIDA COM USER_ID
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  Dimensions,
  RefreshControl,
  Alert,
  Share,
  Platform
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { PieChart, LineChart } from 'react-native-chart-kit';
import { useAuth } from '../services/AuthContext'; // IMPORTANTE: Adicionar

const { width: screenWidth } = Dimensions.get('window');

export default function MonthlyReport() {
  const db = useSQLiteContext();
  const { user } = useAuth(); // IMPORTANTE: Pegar usuário logado
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthModalVisible, setMonthModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDetailedList, setShowDetailedList] = useState(false);
  const [monthData, setMonthData] = useState({
    totalAmount: 0,
    totalTransactions: 0,
    averagePerTransaction: 0,
    categoryDistribution: [],
    dailyExpenses: [],
    expensesList: [],
    topCategory: null,
    biggestExpense: null,
    comparison: {
      previousMonth: 0,
      percentChange: 0
    },
    paymentMethodsDistribution: [],
    establishmentsRanking: []
  });

  const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro'
  ];

  useEffect(() => {
    if (db && user) {
      loadMonthData();
    }
  }, [db, user, selectedMonth, selectedYear]);

  const loadMonthData = useCallback(
    async (isRefresh = false) => {
      if (!user) {
        console.error('Usuário não definido');
        return;
      }

      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

        // 1. Estatísticas gerais do mês - COM USER_ID
        const monthStats = await db.getFirstAsync(
          `
        SELECT 
          COUNT(*) as totalTransactions,
          COALESCE(SUM(CAST(amount AS REAL)), 0) as totalAmount,
          COALESCE(AVG(CAST(amount AS REAL)), 0) as averagePerTransaction,
          COALESCE(MAX(CAST(amount AS REAL)), 0) as maxExpense
        FROM expenses 
        WHERE strftime('%Y-%m', date) = ? AND user_id = ?
      `,
          [monthKey, user.id]
        );

        // 2. Distribuição por categoria - COM USER_ID
        const categoryData = await db.getAllAsync(
          `
        SELECT 
          COALESCE(c.name, 'Sem categoria') as category,
          COALESCE(c.icon, '📦') as icon,
          SUM(CAST(e.amount AS REAL)) as total,
          COUNT(*) as count,
          AVG(CAST(e.amount AS REAL)) as average
        FROM expenses e
        LEFT JOIN categories c ON e.categoryId = c.id
        WHERE strftime('%Y-%m', e.date) = ? AND e.user_id = ?
        GROUP BY c.id, c.name, c.icon
        ORDER BY total DESC
      `,
          [monthKey, user.id]
        );

        // 3. Gastos diários - COM USER_ID
        const dailyData = await db.getAllAsync(
          `
        SELECT 
          strftime('%d', date) as day,
          SUM(CAST(amount AS REAL)) as total,
          COUNT(*) as count
        FROM expenses 
        WHERE strftime('%Y-%m', date) = ? AND user_id = ?
        GROUP BY strftime('%d', date)
        ORDER BY day
      `,
          [monthKey, user.id]
        );

        // 4. Lista completa de despesas - COM USER_ID
        const expensesList = await db.getAllAsync(
          `
        SELECT 
          e.id,
          e.description,
          CAST(e.amount AS REAL) as amount,
          e.date,
          COALESCE(c.name, 'Sem categoria') as category,
          COALESCE(c.icon, '📦') as icon,
          COALESCE(pm.name, '') as payment_method,
          COALESCE(pm.icon, '') as payment_icon,
          COALESCE(est.name, '') as establishment
        FROM expenses e
        LEFT JOIN categories c ON e.categoryId = c.id
        LEFT JOIN payment_methods pm ON e.payment_method_id = pm.id
        LEFT JOIN establishments est ON e.establishment_id = est.id
        WHERE strftime('%Y-%m', e.date) = ? AND e.user_id = ?
        ORDER BY e.date DESC
      `,
          [monthKey, user.id]
        );

        // 5. Maior despesa do mês
        const biggestExpense =
          expensesList.length > 0
            ? expensesList.reduce(
                (max, current) => (current.amount > max.amount ? current : max),
                expensesList[0]
              )
            : null;

        // 6. Comparação com mês anterior - COM USER_ID
        const previousMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
        const previousYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
        const previousMonthKey = `${previousYear}-${String(previousMonth + 1).padStart(2, '0')}`;

        const previousMonthData = await db.getFirstAsync(
          `
        SELECT COALESCE(SUM(CAST(amount AS REAL)), 0) as total
        FROM expenses 
        WHERE strftime('%Y-%m', date) = ? AND user_id = ?
      `,
          [previousMonthKey, user.id]
        );

        const comparison = {
          previousMonth: previousMonthData?.total || 0,
          percentChange:
            previousMonthData?.total > 0
              ? ((monthStats.totalAmount - previousMonthData.total) / previousMonthData.total) * 100
              : 0
        };

        // 7. Distribuição por método de pagamento - COM USER_ID
        const paymentMethodsData = await db.getAllAsync(
          `
        SELECT 
          COALESCE(pm.name, 'Não especificado') as method,
          COALESCE(pm.icon, '💳') as icon,
          SUM(CAST(e.amount AS REAL)) as total,
          COUNT(*) as count
        FROM expenses e
        LEFT JOIN payment_methods pm ON e.payment_method_id = pm.id
        WHERE strftime('%Y-%m', e.date) = ? AND e.user_id = ?
        GROUP BY pm.id, pm.name, pm.icon
        ORDER BY total DESC
      `,
          [monthKey, user.id]
        );

        // 8. Ranking de estabelecimentos - COM USER_ID
        const establishmentsData = await db.getAllAsync(
          `
        SELECT 
          COALESCE(est.name, 'Não especificado') as name,
          COUNT(*) as visits,
          SUM(CAST(e.amount AS REAL)) as total,
          AVG(CAST(e.amount AS REAL)) as average
        FROM expenses e
        LEFT JOIN establishments est ON e.establishment_id = est.id
        WHERE strftime('%Y-%m', e.date) = ? AND e.user_id = ? AND est.id IS NOT NULL
        GROUP BY est.id, est.name
        ORDER BY total DESC
        LIMIT 10
      `,
          [monthKey, user.id]
        );

        // Processar dados
        const processedData = {
          totalAmount: monthStats?.totalAmount || 0,
          totalTransactions: monthStats?.totalTransactions || 0,
          averagePerTransaction: monthStats?.averagePerTransaction || 0,
          categoryDistribution: categoryData.map((item, index) => ({
            ...item,
            color: getColorForIndex(index),
            percentage: monthStats.totalAmount > 0 ? (item.total / monthStats.totalAmount) * 100 : 0
          })),
          dailyExpenses: processDailyData(dailyData),
          expensesList,
          topCategory: categoryData[0] || null,
          biggestExpense,
          comparison,
          paymentMethodsDistribution: paymentMethodsData,
          establishmentsRanking: establishmentsData
        };

        setMonthData(processedData);
      } catch (error) {
        console.error('❌ Erro ao carregar dados do mês:', error);
        Alert.alert('Erro', 'Não foi possível carregar os dados do mês.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [db, user, selectedMonth, selectedYear]
  );

  const processDailyData = dailyData => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const processedData = [];

    for (let i = 1; i <= daysInMonth; i++) {
      const dayStr = String(i).padStart(2, '0');
      const dayData = dailyData.find(d => d.day === dayStr);

      processedData.push({
        day: i,
        total: dayData ? dayData.total : 0,
        count: dayData ? dayData.count : 0
      });
    }

    return processedData;
  };

  const formatCurrency = value => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatPercentage = value => {
    return `${Math.abs(value).toFixed(1)}%`;
  };

  const formatDate = dateString => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getColorForIndex = index => {
    const colors = [
      '#10B981',
      '#3B82F6',
      '#EF4444',
      '#F59E0B',
      '#8B5CF6',
      '#EC4899',
      '#14B8A6',
      '#F97316'
    ];
    return colors[index % colors.length];
  };

  const shareReport = async () => {
    try {
      const monthName = monthNames[selectedMonth];
      const { totalAmount, totalTransactions, categoryDistribution } = monthData;

      let message = `📊 RELATÓRIO DE DESPESAS\n`;
      message += `${monthName} de ${selectedYear}\n\n`;
      message += `💰 Total: ${formatCurrency(totalAmount)}\n`;
      message += `📝 Transações: ${totalTransactions}\n`;
      message += `📊 Média: ${formatCurrency(totalAmount / totalTransactions)}\n\n`;
      message += `POR CATEGORIA:\n`;

      categoryDistribution.slice(0, 5).forEach(cat => {
        message += `${cat.icon} ${cat.category}: ${formatCurrency(cat.total)} (${cat.percentage.toFixed(1)}%)\n`;
      });

      await Share.share({
        message,
        title: `Relatório ${monthName}/${selectedYear}`
      });
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
    }
  };

  const onRefresh = useCallback(() => {
    loadMonthData(true);
  }, [loadMonthData]);

  const pieChartData = useMemo(() => {
    return monthData.categoryDistribution.slice(0, 5).map(cat => ({
      name: cat.category,
      population: cat.total,
      color: cat.color,
      legendFontColor: '#374151',
      legendFontSize: 11
    }));
  }, [monthData.categoryDistribution]);

  const lineChartData = useMemo(() => {
    const days = monthData.dailyExpenses.filter(d => d.total > 0);

    if (days.length === 0) {
      return {
        labels: ['Sem dados'],
        datasets: [{ data: [0] }]
      };
    }

    return {
      labels: days.map(d => d.day.toString()),
      datasets: [
        {
          data: days.map(d => d.total),
          color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
          strokeWidth: 2
        }
      ]
    };
  }, [monthData.dailyExpenses]);

  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0
  };

  const renderExpenseItem = ({ item }) => (
    <View style={styles.expenseItem}>
      <View style={styles.expenseIcon}>
        <Text>{item.icon}</Text>
      </View>
      <View style={styles.expenseDetails}>
        <Text style={styles.expenseDescription} numberOfLines={1}>
          {item.description}
        </Text>
        <Text style={styles.expenseMeta}>
          {formatDate(item.date)} • {item.category}
          {item.payment_method && ` • ${item.payment_icon} ${item.payment_method}`}
        </Text>
      </View>
      <Text style={styles.expenseAmount}>{formatCurrency(item.amount)}</Text>
    </View>
  );

  const MonthYearPicker = () => {
    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).reverse();

    return (
      <Modal
        visible={monthModalVisible}
        transparent={true}
        animationType='slide'
        onRequestClose={() => setMonthModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📅 Selecionar Período</Text>
              <TouchableOpacity onPress={() => setMonthModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {years.map(year => (
                <View key={year}>
                  <Text style={styles.yearHeader}>{year}</Text>
                  <View style={styles.monthGrid}>
                    {monthNames.map((month, index) => {
                      const isSelected = selectedYear === year && selectedMonth === index;
                      const isFuture =
                        year > new Date().getFullYear() ||
                        (year === new Date().getFullYear() && index > new Date().getMonth());

                      return (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.monthItem,
                            isSelected && styles.monthItemSelected,
                            isFuture && styles.monthItemDisabled
                          ]}
                          onPress={() => {
                            if (!isFuture) {
                              setSelectedYear(year);
                              setSelectedMonth(index);
                              setMonthModalVisible(false);
                            }
                          }}
                          disabled={isFuture}
                        >
                          <Text
                            style={[
                              styles.monthItemText,
                              isSelected && styles.monthItemTextSelected,
                              isFuture && styles.monthItemTextDisabled
                            ]}
                          >
                            {month.substring(0, 3)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#6366F1' />
        <Text style={styles.loadingText}>Carregando relatório...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Faça login para ver seus relatórios</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.monthSelector} onPress={() => setMonthModalVisible(true)}>
          <Text style={styles.monthSelectorText}>
            {monthNames[selectedMonth]} {selectedYear}
          </Text>
          <Text style={styles.monthSelectorIcon}>▼</Text>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionButton} onPress={shareReport}>
            <Text style={styles.actionIcon}>📤</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366F1']} />
        }
      >
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Resumo do Mês</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{formatCurrency(monthData.totalAmount)}</Text>
              <Text style={styles.summaryLabel}>Total Gasto</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{monthData.totalTransactions}</Text>
              <Text style={styles.summaryLabel}>Transações</Text>
            </View>
          </View>

          {monthData.comparison.previousMonth > 0 && (
            <View style={styles.comparisonContainer}>
              <Text style={styles.comparisonText}>
                {monthData.comparison.percentChange > 0 ? '📈' : '📉'}{' '}
                {formatPercentage(monthData.comparison.percentChange)} vs mês anterior
              </Text>
            </View>
          )}
        </View>

        {pieChartData.length > 0 && (
          <View style={styles.chartSection}>
            <Text style={styles.sectionTitle}>📊 Distribuição por Categoria</Text>
            <View style={styles.chartCard}>
              <PieChart
                data={pieChartData}
                width={screenWidth - 40}
                height={200}
                chartConfig={chartConfig}
                accessor='population'
                backgroundColor='transparent'
                paddingLeft='15'
              />
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏆 Top Categorias</Text>
          {monthData.categoryDistribution.slice(0, 5).map((cat, index) => (
            <View key={index} style={styles.categoryItem}>
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                <Text style={styles.categoryName}>{cat.category}</Text>
              </View>
              <View style={styles.categoryStats}>
                <Text style={styles.categoryAmount}>{formatCurrency(cat.total)}</Text>
                <Text style={styles.categoryPercentage}>{cat.percentage.toFixed(1)}%</Text>
              </View>
            </View>
          ))}
        </View>

        {monthData.paymentMethodsDistribution.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💳 Formas de Pagamento</Text>
            {monthData.paymentMethodsDistribution.map((method, index) => (
              <View key={index} style={styles.paymentItem}>
                <Text style={styles.paymentIcon}>{method.icon}</Text>
                <Text style={styles.paymentName}>{method.method}</Text>
                <Text style={styles.paymentAmount}>{formatCurrency(method.total)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📋 Todas as Despesas</Text>
            <TouchableOpacity onPress={() => setShowDetailedList(!showDetailedList)}>
              <Text style={styles.toggleButton}>
                {showDetailedList ? 'Ocultar' : 'Mostrar'} ({monthData.expensesList.length})
              </Text>
            </TouchableOpacity>
          </View>

          {showDetailedList && (
            <FlatList
              data={monthData.expensesList}
              keyExtractor={item => item.id.toString()}
              renderItem={renderExpenseItem}
              scrollEnabled={false}
            />
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <MonthYearPicker />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },

  header: {
    backgroundColor: '#6366F1',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  monthSelectorText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8
  },
  monthSelectorIcon: {
    color: '#FFFFFF',
    fontSize: 12
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12
  },
  actionButton: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  actionIcon: {
    fontSize: 20
  },

  content: {
    flex: 1
  },

  summaryCard: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16
  },
  summaryGrid: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center'
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 4
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280'
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB'
  },
  comparisonContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6'
  },
  comparisonText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center'
  },

  section: {
    marginHorizontal: 20,
    marginBottom: 24
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12
  },
  toggleButton: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '500'
  },

  chartSection: {
    marginHorizontal: 20,
    marginBottom: 24
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4
  },

  categoryItem: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  categoryIcon: {
    fontSize: 20,
    marginRight: 12
  },
  categoryName: {
    fontSize: 16,
    color: '#374151',
    flex: 1
  },
  categoryStats: {
    alignItems: 'flex-end'
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937'
  },
  categoryPercentage: {
    fontSize: 12,
    color: '#6B7280'
  },

  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8
  },
  paymentIcon: {
    fontSize: 20,
    marginRight: 12
  },
  paymentName: {
    flex: 1,
    fontSize: 14,
    color: '#374151'
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937'
  },

  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8
  },
  expenseIcon: {
    width: 36,
    height: 36,
    backgroundColor: '#F3F4F6',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  expenseDetails: {
    flex: 1
  },
  expenseDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2
  },
  expenseMeta: {
    fontSize: 12,
    color: '#6B7280'
  },
  expenseAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669'
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937'
  },
  closeButton: {
    fontSize: 20,
    color: '#6B7280'
  },
  modalBody: {
    padding: 20
  },
  yearHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    marginTop: 8
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16
  },
  monthItem: {
    width: '25%',
    paddingVertical: 12,
    alignItems: 'center'
  },
  monthItemSelected: {
    backgroundColor: '#EEF2FF',
    borderRadius: 8
  },
  monthItemDisabled: {
    opacity: 0.3
  },
  monthItemText: {
    fontSize: 14,
    color: '#374151'
  },
  monthItemTextSelected: {
    color: '#6366F1',
    fontWeight: '600'
  },
  monthItemTextDisabled: {
    color: '#9CA3AF'
  },

  bottomSpacer: {
    height: 40
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280'
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444'
  }
});
