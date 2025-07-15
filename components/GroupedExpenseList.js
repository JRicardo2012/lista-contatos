import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  ScrollView
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

const GroupedExpenseList = () => {
  const db = useSQLiteContext();
  const [groupedExpenses, setGroupedExpenses] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalGeral, setTotalGeral] = useState(0);
  const [totalDias, setTotalDias] = useState(0);
  const [expandedGroups, setExpandedGroups] = useState({}); // Estado para controlar grupos expandidos
  const [lastUpdated, setLastUpdated] = useState(null); // Timestamp da última atualização

  // Gera os últimos 7 dias
  const generateLast7Days = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const formatted = date.toLocaleDateString('pt-BR');
      const dayName = date.toLocaleDateString('pt-BR', { weekday: 'long' });
      
      let displayName, emoji;
      if (i === 0) {
        displayName = 'Hoje';
        emoji = '🌟';
      } else if (i === 1) {
        displayName = 'Ontem';
        emoji = '🕐';
      } else {
        displayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
        emoji = '📅';
      }
      
      days.push({
        formatted,
        displayName,
        emoji,
        date: new Date(date)
      });
    }
    return days;
  };

  useEffect(() => {
    if (db) {
      loadGroupedExpenses(true);
    } else {
      // Se não tem db ainda, cria estrutura vazia dos últimos 7 dias
      const emptyStructure = {};
      const last7Days = generateLast7Days();
      
      last7Days.forEach(day => {
        emptyStructure[day.formatted] = {
          expenses: [],
          isEmpty: true,
          dateInfo: day
        };
      });
      
      setGroupedExpenses(emptyStructure);
      setTotalGeral(0);
      setTotalDias(0);
    }
  }, [db]);

  // Sistema de notificação automática melhorado
  useEffect(() => {
    if (!global.expenseListeners) {
      global.expenseListeners = [];
    }

    const updateFunction = () => {
      console.log('📢 Recebeu notificação de mudança - recarregando resumo...');
      if (db && !loading) {
        // Força reload com timeout para garantir que banco foi atualizado
        setTimeout(() => {
          loadGroupedExpenses(false);
        }, 100);
      }
    };

    global.expenseListeners.push(updateFunction);

    // Cleanup melhorado
    return () => {
      if (global.expenseListeners) {
        const index = global.expenseListeners.indexOf(updateFunction);
        if (index > -1) {
          global.expenseListeners.splice(index, 1);
        }
      }
    };
  }, [db, loading]);

  // Auto-reload a cada 30 segundos dos últimos 7 dias (desabilitado temporariamente para debug)
  useEffect(() => {
    // Comentado temporariamente para evitar conflitos durante debug
    // const interval = setInterval(() => {
    //   if (db && !loading && !refreshing) {
    //     console.log('🔄 Auto-reload silencioso (30s)');
    //     loadGroupedExpenses(false);
    //   }
    // }, 30000);

    // return () => clearInterval(interval);
  }, [db, loading, refreshing]);

  const loadGroupedExpenses = async (isInitialLoad = false) => {
    try {
      console.log('🔍 === CARREGANDO RESUMO ÚLTIMOS 7 DIAS ===');
      
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      // Busca despesas dos últimos 7 dias
      const result = await db.getAllAsync(`
        SELECT 
          e.id, 
          e.description, 
          CAST(e.amount AS REAL) AS value, 
          e.date, 
          COALESCE(c.name, 'Sem categoria') as category, 
          COALESCE(c.icon, '📦') as icon
        FROM expenses e
        LEFT JOIN categories c ON e.categoryId = c.id
        WHERE date(e.date) >= date('now', '-7 days')
        ORDER BY e.date DESC
      `);

      console.log('📊 Despesas dos últimos 7 dias:', result.length);
      console.log('📅 Primeiras 3 datas no banco:', result.slice(0, 3).map(r => r.date));

      // Gera últimos 7 dias
      const last7Days = generateLast7Days();
      console.log('📅 Últimos 7 dias gerados:', last7Days);

      const grouped = {};
      let total = 0;
      let validExpenses = 0;
      
      // Primeiro, cria estrutura para todos os 7 dias
      last7Days.forEach(day => {
        grouped[day.formatted] = {
          expenses: [],
          isEmpty: true,
          dateInfo: day
        };
      });

      // Depois, popula com as despesas existentes
      result.forEach((item, index) => {
        try {
          let dateKey;
          if (item.date) {
            let date;
            
            if (item.date.includes('-')) {
              date = new Date(item.date);
            } else {
              date = new Date(item.date);
            }
            
            if (isNaN(date.getTime())) {
              console.warn(`⚠️ Data inválida no item ${index}:`, item.date);
              return;
            } else {
              const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
              dateKey = localDate.toLocaleDateString('pt-BR');
              console.log(`📅 Item ${index}: ${item.date} -> ${dateKey}`);
            }
          } else {
            console.warn(`⚠️ Data ausente no item ${index}`);
            return;
          }
          
          // Só processa se o dia está nos últimos 7 dias
          if (grouped[dateKey]) {
            let value = 0;
            if (item.value !== null && item.value !== undefined) {
              value = parseFloat(item.value);
              if (isNaN(value)) {
                console.warn(`⚠️ Valor inválido no item ${index}:`, item.value);
                value = 0;
              }
            }
            
            const expense = {
              id: item.id,
              description: item.description || 'Sem descrição',
              value: value,
              date: item.date,
              category: item.category,
              icon: item.icon
            };
            
            grouped[dateKey].expenses.push(expense);
            grouped[dateKey].isEmpty = false;
            total += value;
            validExpenses++;
          }
          
        } catch (error) {
          console.error(`❌ Erro ao processar item ${index}:`, error, item);
        }
      });

      console.log('✅ Processamento concluído:');
      console.log(`   - ${validExpenses} despesas válidas`);
      console.log(`   - 7 dias processados`);
      console.log(`   - Dias com gastos:`, Object.keys(grouped).filter(day => grouped[day] && !grouped[day].isEmpty));
      console.log(`   - Total: R$ ${total.toFixed(2)}`);

      setGroupedExpenses(grouped);
      setTotalGeral(total);
      setTotalDias(Object.keys(grouped).filter(day => grouped[day] && !grouped[day].isEmpty).length);
      setLastUpdated(new Date());
      
    } catch (error) {
      console.error('❌ Erro ao carregar despesas agrupadas:', error);
      if (isInitialLoad) {
        Alert.alert(
          'Erro', 
          'Não foi possível carregar o resumo. Verifique o console para detalhes.'
        );
      }
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  };

  async function debugDatabase() {
    try {
      console.log('🔍 === DEBUG DOS ÚLTIMOS 7 DIAS ===');
      
      const expensesStructure = await db.getAllAsync("PRAGMA table_info(expenses)");
      console.log('🏗️ Estrutura da tabela expenses:', expensesStructure);
      
      const expensesCount = await db.getFirstAsync("SELECT COUNT(*) as total FROM expenses");
      console.log('📊 Total de despesas no banco:', expensesCount.total);
      
      // Busca despesas dos últimos 7 dias
      const last7DaysExpenses = await db.getAllAsync(`
        SELECT *, datetime(date, 'localtime') as formatted_date 
        FROM expenses 
        WHERE date(date) >= date('now', '-7 days')
        ORDER BY date DESC
      `);
      console.log('📄 Despesas dos últimos 7 dias:', last7DaysExpenses);
      
      // Verifica especificamente despesas de hoje
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const todayExpenses = await db.getAllAsync(`
        SELECT * FROM expenses 
        WHERE date(date) = date('${today}')
        ORDER BY date DESC
      `);
      console.log('📅 Despesas de hoje:', todayExpenses);
      
      const categoriesCount = await db.getFirstAsync("SELECT COUNT(*) as total FROM categories");
      console.log('📂 Total de categorias:', categoriesCount.total);
      
      // Calcula estatísticas dos últimos 7 dias
      const daysWithExpenses = Object.keys(groupedExpenses).filter(day => 
        groupedExpenses[day] && !groupedExpenses[day].isEmpty
      ).length;
      const daysWithoutExpenses = 7 - daysWithExpenses;
      
      // Força reload após debug
      await loadGroupedExpenses(false);
      
      Alert.alert(
        '🔍 Debug - Últimos 7 Dias',
        `Despesas total: ${expensesCount.total}\nÚltimos 7 dias: ${last7DaysExpenses.length}\nDespesas hoje: ${todayExpenses.length}\nDias com gastos: ${daysWithExpenses}\nDias economizando: ${daysWithoutExpenses}\nCategorias: ${categoriesCount.total}\n\nResumo foi recarregado!`
      );
      
    } catch (error) {
      console.error('❌ Erro no debug:', error);
      Alert.alert('Erro', 'Erro ao acessar banco: ' + error.message);
    }
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  }

  function formatDateHeader(dateString) {
    // Para compatibilidade com a nova estrutura
    const dayData = groupedExpenses[dateString]?.dateInfo;
    if (dayData) {
      return {
        main: dayData.displayName,
        sub: dateString,
        emoji: dayData.emoji
      };
    }
    
    // Fallback para o formato antigo
    try {
      const date = new Date(dateString.split('/').reverse().join('-'));
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (date.toDateString() === today.toDateString()) {
        return { main: 'Hoje', sub: dateString, emoji: '🌟' };
      } else if (date.toDateString() === yesterday.toDateString()) {
        return { main: 'Ontem', sub: dateString, emoji: '🕐' };
      } else {
        const dayName = date.toLocaleDateString('pt-BR', { weekday: 'long' });
        return { 
          main: dayName.charAt(0).toUpperCase() + dayName.slice(1), 
          sub: dateString,
          emoji: '📅'
        };
      }
    } catch (error) {
      return { main: dateString, sub: '', emoji: '📅' };
    }
  }

  // Mensagens motivacionais para dias sem gastos
  const getEconomyMessage = () => {
    const messages = [
      "🎯 Parabéns! Você está economizando!",
      "💪 Dia sem gastos! Continue assim!",
      "🌟 Excelente! Controle total das finanças!",
      "🏆 Dia de economia! Você está no caminho certo!",
      "💚 Sem gastos hoje! Sua carteira agradece!",
      "🎉 Dia livre de despesas! Que disciplina!",
      "⭐ Zero gastos! Você é um exemplo!",
      "🥇 Perfeito! Dia de economia total!"
    ];
    
    return messages[Math.floor(Math.random() * messages.length)];
  };

  async function handleDeleteExpense(id, description) {
    Alert.alert(
      "⚠️ Confirmar Exclusão",
      `Deseja excluir "${description}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await db.runAsync("DELETE FROM expenses WHERE id = ?", [id]);
              await loadGroupedExpenses(false);
              Alert.alert("Sucesso", "Despesa excluída!");
            } catch (error) {
              console.error("Erro ao excluir:", error);
              Alert.alert("Erro", "Não foi possível excluir a despesa.");
            }
          },
        },
      ]
    );
  }

  // Função para alternar expansão do grupo
  const toggleGroupExpansion = (date) => {
    setExpandedGroups(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  };

  // Renderiza item de despesa compacto (só aparece quando grupo expandido)
  const renderExpenseItem = ({ item, index, isLast }) => {
    return (
      <View style={styles.expenseCard}>
        <TouchableOpacity 
          style={[
            styles.expenseContent,
            isLast && styles.expenseContentLast
          ]}
          activeOpacity={0.7}
        >
          {/* Ícone da categoria */}
          <View style={styles.categoryIconContainer}>
            <Text style={styles.categoryIcon}>{item.icon || '📦'}</Text>
          </View>
          
          {/* Informações da despesa em linha */}
          <View style={styles.expenseInfo}>
            <View style={styles.expenseLeft}>
              <Text style={styles.expenseDescription} numberOfLines={1}>
                {item.description}
              </Text>
              <Text style={styles.expenseCategory}>
                📂 {item.category}
              </Text>
            </View>
            <Text style={styles.expenseAmount}>
              {formatCurrency(item.value)}
            </Text>
          </View>
        </TouchableOpacity>
        
        {/* Botão de excluir */}
        <TouchableOpacity 
          style={[
            styles.deleteButton,
            isLast && styles.deleteButtonLast
          ]}
          onPress={() => handleDeleteExpense(item.id, item.description)}
        >
          <Text style={styles.deleteText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Renderiza grupo por data com opção de expansão
  const renderGroup = ({ item: date }) => {
    const dayData = groupedExpenses[date];
    
    // Verificação de segurança
    if (!dayData) {
      console.warn('⚠️ dayData não encontrado para:', date);
      return null;
    }
    
    const expenses = dayData.expenses || [];
    const isEmpty = dayData.isEmpty !== false; // Considera true se undefined
    const total = expenses.reduce((sum, item) => sum + (item.value || 0), 0);
    const dateFormatted = formatDateHeader(date);
    const isExpanded = expandedGroups[date];
    
    return (
      <View style={styles.groupContainer}>
        {/* Header do grupo - sempre visível e clicável */}
        <TouchableOpacity 
          style={[
            styles.groupHeader,
            (!isExpanded || isEmpty) && styles.groupHeaderCollapsed
          ]}
          onPress={() => !isEmpty && toggleGroupExpansion(date)}
          activeOpacity={isEmpty ? 1 : 0.7}
        >
          <View style={styles.groupHeaderLeft}>
            <Text style={styles.groupEmoji}>{dateFormatted.emoji}</Text>
            <View style={styles.groupDateContainer}>
              <Text style={styles.groupDateMain}>{dateFormatted.main}</Text>
              {dateFormatted.sub && (
                <Text style={styles.groupDateSub}>{dateFormatted.sub}</Text>
              )}
            </View>
          </View>
          <View style={styles.groupHeaderRight}>
            {isEmpty ? (
              <View style={styles.economyContainer}>
                <Text style={styles.economyIcon}>💚</Text>
                <Text style={styles.economyText}>R$ 0,00</Text>
              </View>
            ) : (
              <>
                <Text style={styles.groupTotal}>{formatCurrency(total)}</Text>
                <View style={styles.groupMetaContainer}>
                  <Text style={styles.groupCount}>{expenses.length} item{expenses.length !== 1 ? 's' : ''}</Text>
                  <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
        
        {/* Conteúdo expandido */}
        {isEmpty ? (
          /* Mensagem de economia para dias sem gastos */
          <View style={styles.economyMessageContainer}>
            <Text style={styles.economyMessage}>{getEconomyMessage()}</Text>
          </View>
        ) : (
          /* Lista de despesas - só aparece quando expandido */
          isExpanded && expenses.length > 0 && (
            <FlatList
              data={expenses}
              keyExtractor={(item) => `grouped-expense-${item.id}`}
              renderItem={({ item, index }) => renderExpenseItem({ item, index, isLast: index === expenses.length - 1 })}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          )
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Carregando últimos 7 dias...</Text>
      </View>
    );
  }

  const groupKeys = Object.keys(groupedExpenses);

  // Se não temos dados ainda, mostra loading
  if (groupKeys.length === 0 && !loading) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📊</Text>
        <Text style={styles.emptyTitle}>Carregando últimos 7 dias</Text>
        <Text style={styles.emptySubtitle}>
          Seus gastos dos últimos 7 dias aparecerão aqui!
        </Text>
        <TouchableOpacity 
          style={styles.debugButton}
          onPress={debugDatabase}
        >
          <Text style={styles.debugButtonText}>🔍 Verificar Banco de Dados</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header com estatísticas */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.debugButtonSmall}
            onPress={debugDatabase}
          >
            <Text style={styles.debugButtonSmallText}>🔍</Text>
          </TouchableOpacity>
          <Text style={styles.headerIcon}>📊</Text>
          <Text style={styles.headerTitle}>Últimos 7 Dias</Text>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={() => loadGroupedExpenses(false)}
          >
            <Text style={styles.refreshButtonText}>
              {refreshing ? '🔄' : '↻'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Cards de estatísticas */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.statsContainer}
        >
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>💰</Text>
            <Text style={styles.statValue}>{formatCurrency(totalGeral)}</Text>
            <Text style={styles.statLabel}>Total 7 Dias</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📅</Text>
            <Text style={styles.statValue}>{totalDias}</Text>
            <Text style={styles.statLabel}>Dias com Gastos</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>💚</Text>
            <Text style={styles.statValue}>{7 - totalDias}</Text>
            <Text style={styles.statLabel}>Dias Economia</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📊</Text>
            <Text style={styles.statValue}>
              {totalDias > 0 ? formatCurrency(totalGeral / totalDias) : 'R$ 0,00'}
            </Text>
            <Text style={styles.statLabel}>Média por Dia</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📝</Text>
            <Text style={styles.statValue}>
              {Object.values(groupedExpenses).reduce((acc, dayData) => {
                return acc + (dayData && dayData.expenses ? dayData.expenses.length : 0);
              }, 0)}
            </Text>
            <Text style={styles.statLabel}>Total de Itens</Text>
          </View>
        </ScrollView>
        
        {/* Indicador de última atualização */}
        {lastUpdated && (
          <Text style={styles.lastUpdatedText}>
            Última atualização: {lastUpdated.toLocaleTimeString('pt-BR')} • Últimos 7 dias
          </Text>
        )}
      </View>

      {/* Lista de grupos com pull-to-refresh */}
      <FlatList
        data={groupKeys.sort((a, b) => {
          // Ordena por data (mais recente primeiro)
          const dateA = groupedExpenses[a]?.dateInfo?.date || new Date(a.split('/').reverse().join('-'));
          const dateB = groupedExpenses[b]?.dateInfo?.date || new Date(b.split('/').reverse().join('-'));
          return dateB - dateA;
        })}
        keyExtractor={(item) => item}
        renderItem={renderGroup}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={() => loadGroupedExpenses(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },

  // Header compacto
  header: {
    backgroundColor: '#fff',
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  debugButtonSmall: {
    width: 36,
    height: 36,
    backgroundColor: '#fef3c7',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  debugButtonSmallText: {
    fontSize: 16,
  },
  headerIcon: {
    fontSize: 28,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  refreshButton: {
    width: 36,
    height: 36,
    backgroundColor: '#f3f4f6',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshButtonText: {
    fontSize: 18,
  },

  // Cards de estatísticas compactos
  statsContainer: {
    paddingLeft: 20,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginRight: 10,
    minWidth: 100,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 3,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: '600',
  },
  lastUpdatedText: {
    fontSize: 10,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },

  // Lista compacta
  list: {
    padding: 12,
  },

  // Grupo por data compacto
  groupContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  groupHeaderCollapsed: {
    borderBottomWidth: 0,
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupEmoji: {
    fontSize: 20,
    marginRight: 10,
  },
  groupDateContainer: {
    
  },
  groupDateMain: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  groupDateSub: {
    fontSize: 11,
    color: '#6b7280',
  },
  groupHeaderRight: {
    alignItems: 'flex-end',
  },
  groupTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 2,
  },
  groupMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupCount: {
    fontSize: 11,
    color: '#6b7280',
    marginRight: 8,
  },
  expandIcon: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: 'bold',
  },

  // Economia styles
  economyContainer: {
    alignItems: 'flex-end',
  },
  economyIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  economyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
  },
  economyMessageContainer: {
    backgroundColor: '#f0fdf4',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#dcfce7',
  },
  economyMessage: {
    fontSize: 14,
    color: '#166534',
    fontWeight: '600',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Cards de despesas compactos
  expenseCard: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingLeft: 0,
  },
  expenseContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  expenseContentLast: {
    borderBottomWidth: 0,
  },
  categoryIconContainer: {
    width: 32,
    height: 32,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  categoryIcon: {
    fontSize: 14,
  },
  expenseInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  expenseLeft: {
    flex: 1,
  },
  expenseDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 1,
  },
  expenseCategory: {
    fontSize: 10,
    color: '#6b7280',
  },
  expenseAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10b981',
    marginLeft: 8,
  },
  
  // Botão de delete compacto
  deleteButton: {
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    width: 44,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  deleteButtonLast: {
    borderBottomWidth: 0,
  },
  deleteText: {
    fontSize: 14,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  debugButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  debugButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 16,
  },
});

export default GroupedExpenseList;