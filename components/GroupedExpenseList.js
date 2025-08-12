import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  ScrollView,
  RefreshControl
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuth } from '../services/AuthContext';
import { formatCurrency, formatDate } from '../utils/helpers';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  NUBANK_COLORS,
  NUBANK_SPACING,
  NUBANK_FONT_SIZES,
  NUBANK_BORDER_RADIUS,
  NUBANK_FONT_WEIGHTS,
  NUBANK_SHADOWS
} from '../constants/nubank-theme';

const GroupedExpenseList = () => {
  const db = useSQLiteContext();
  const { user } = useAuth();
  const [groupedExpenses, setGroupedExpenses] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalGeral, setTotalGeral] = useState(0);
  const [totalDias, setTotalDias] = useState(0);
  const [expandedGroups, setExpandedGroups] = useState({}); // Estado para controlar grupos expandidos
  const [lastUpdated, setLastUpdated] = useState(null); // Timestamp da última atualização
  const [error, setError] = useState(null); // Estado de erro

  // Gera os últimos 7 dias (memoizado para performance)
  const generateLast7Days = useCallback(() => {
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
  }, []);

  useEffect(() => {
    if (db && user) {
      loadGroupedExpenses(true);
    } else if (!user) {
      setError('Usuário não autenticado');
      setLoading(false);
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
  }, [db, user, loadGroupedExpenses, generateLast7Days]);

  // Sistema de notificação automática melhorado com useCallback
  const handleExpenseUpdate = useCallback(() => {
    console.log('📢 Recebeu notificação de mudança - recarregando resumo...');
    if (db && user && !loading) {
      // Força reload com timeout para garantir que banco foi atualizado
      setTimeout(() => {
        loadGroupedExpenses(false);
      }, 100);
    }
  }, [db, user, loading, loadGroupedExpenses]);

  useEffect(() => {
    if (!global.expenseListeners) {
      global.expenseListeners = [];
    }

    global.expenseListeners.push(handleExpenseUpdate);

    // Cleanup melhorado
    return () => {
      if (global.expenseListeners) {
        const index = global.expenseListeners.indexOf(handleExpenseUpdate);
        if (index > -1) {
          global.expenseListeners.splice(index, 1);
        }
      }
    };
  }, [handleExpenseUpdate]);

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

  const loadGroupedExpenses = useCallback(
    async (isInitialLoad = false) => {
      if (!db || !user) {
        setError('Database ou usuário não disponível');
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 === CARREGANDO RESUMO ÚLTIMOS 7 DIAS PARA USUÁRIO ===', user.id);

        setError(null); // Limpa erros anteriores

        if (isInitialLoad) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        // Busca despesas dos últimos 7 dias FILTRADA POR USUÁRIO
        const result = await db.getAllAsync(
          `
        SELECT 
          e.id, 
          e.description, 
          CAST(e.amount AS REAL) AS value, 
          e.date, 
          COALESCE(c.name, 'Sem categoria') as category, 
          COALESCE(c.icon, '📦') as icon,
          COALESCE(pm.name, '') as payment_method,
          COALESCE(pm.icon, '') as payment_icon
        FROM expenses e
        LEFT JOIN categories c ON e.categoryId = c.id AND c.user_id = ?
        LEFT JOIN payment_methods pm ON e.payment_method_id = pm.id AND pm.user_id = ?
        WHERE date(e.date) >= date('now', '-7 days')
        AND e.user_id = ?
        ORDER BY e.date DESC
      `,
          [user.id, user.id, user.id]
        );

        console.log('📊 Despesas dos últimos 7 dias:', result.length);
        console.log(
          '📅 Primeiras 3 datas no banco:',
          result.slice(0, 3).map(r => r.date)
        );

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
                const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
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
                icon: item.icon,
                payment_method: item.payment_method,
                payment_icon: item.payment_icon
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
        console.log(
          `   - Dias com gastos:`,
          Object.keys(grouped).filter(day => grouped[day] && !grouped[day].isEmpty)
        );
        console.log(`   - Total: R$ ${total.toFixed(2)}`);

        setGroupedExpenses(grouped);
        setTotalGeral(total);
        setTotalDias(
          Object.keys(grouped).filter(day => grouped[day] && !grouped[day].isEmpty).length
        );
        setLastUpdated(new Date());
      } catch (error) {
        console.error('❌ Erro ao carregar despesas agrupadas:', error);
        setError('Erro ao carregar dados: ' + error.message);

        if (isInitialLoad) {
          Alert.alert('Erro', 'Não foi possível carregar o resumo. Tente novamente.');
        }
      } finally {
        if (isInitialLoad) {
          setLoading(false);
        } else {
          setRefreshing(false);
        }
      }
    },
    [db, user, generateLast7Days]
  );

  const debugDatabase = useCallback(async () => {
    if (!db || !user) {
      Alert.alert('Erro', 'Database ou usuário não disponível');
      return;
    }

    try {
      console.log('🔍 === DEBUG DOS ÚLTIMOS 7 DIAS PARA USUÁRIO ===', user.id);

      const expensesStructure = await db.getAllAsync('PRAGMA table_info(expenses)');
      console.log('🏗️ Estrutura da tabela expenses:', expensesStructure);

      const expensesCount = await db.getFirstAsync(
        'SELECT COUNT(*) as total FROM expenses WHERE user_id = ?',
        [user.id]
      );
      console.log('📊 Total de despesas do usuário:', expensesCount.total);

      // Busca despesas dos últimos 7 dias FILTRADA POR USUÁRIO
      const last7DaysExpenses = await db.getAllAsync(
        `
        SELECT *, datetime(date, 'localtime') as formatted_date 
        FROM expenses 
        WHERE date(date) >= date('now', '-7 days')
        AND user_id = ?
        ORDER BY date DESC
      `,
        [user.id]
      );
      console.log('📄 Despesas dos últimos 7 dias do usuário:', last7DaysExpenses);

      // Verifica especificamente despesas de hoje
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const todayExpenses = await db.getAllAsync(
        `
        SELECT * FROM expenses 
        WHERE date(date) = date('${today}')
        AND user_id = ?
        ORDER BY date DESC
      `,
        [user.id]
      );
      console.log('📅 Despesas de hoje do usuário:', todayExpenses);

      const categoriesCount = await db.getFirstAsync(
        'SELECT COUNT(*) as total FROM categories WHERE user_id = ?',
        [user.id]
      );
      console.log('📂 Total de categorias do usuário:', categoriesCount.total);

      // Calcula estatísticas dos últimos 7 dias
      const daysWithExpenses = Object.keys(groupedExpenses).filter(
        day => groupedExpenses[day] && !groupedExpenses[day].isEmpty
      ).length;
      const daysWithoutExpenses = 7 - daysWithExpenses;

      // Força reload após debug
      await loadGroupedExpenses(false);

      Alert.alert(
        '🔍 Debug - Últimos 7 Dias (Usuário: ' + user.name + ')',
        `Despesas total: ${expensesCount.total}\nÚltimos 7 dias: ${last7DaysExpenses.length}\nDespesas hoje: ${todayExpenses.length}\nDias com gastos: ${daysWithExpenses}\nDias economizando: ${daysWithoutExpenses}\nCategorias: ${categoriesCount.total}\n\nResumo foi recarregado!`
      );
    } catch (error) {
      console.error('❌ Erro no debug:', error);
      Alert.alert('Erro', 'Erro ao acessar banco: ' + error.message);
    }
  }, [db, user, groupedExpenses, loadGroupedExpenses]);

  // Função de formatação memoizada (usando helper se disponível)
  const formatCurrencyLocal = useCallback(value => {
    if (formatCurrency) {
      return formatCurrency(value);
    }
    // Fallback
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  }, []);

  const formatDateHeader = useCallback(
    dateString => {
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
    },
    [groupedExpenses]
  );

  // Mensagens motivacionais para dias sem gastos (memoizada)
  const getEconomyMessage = useCallback(() => {
    const messages = [
      '🎯 Parabéns! Você está economizando!',
      '💪 Dia sem gastos! Continue assim!',
      '🌟 Excelente! Controle total das finanças!',
      '🏆 Dia de economia! Você está no caminho certo!',
      '💚 Sem gastos hoje! Sua carteira agradece!',
      '🎉 Dia livre de despesas! Que disciplina!',
      '⭐ Zero gastos! Você é um exemplo!',
      '🥇 Perfeito! Dia de economia total!'
    ];

    return messages[Math.floor(Math.random() * messages.length)];
  }, []);

  const handleDeleteExpense = useCallback(
    async (id, description) => {
      if (!user) {
        Alert.alert('Erro', 'Usuário não autenticado');
        return;
      }

      Alert.alert('⚠️ Confirmar Exclusão', `Deseja excluir "${description}"?`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              // Verifica se a despesa pertence ao usuário antes de deletar
              await db.runAsync('DELETE FROM expenses WHERE id = ? AND user_id = ?', [id, user.id]);
              await loadGroupedExpenses(false);

              // Notifica outros componentes sobre a mudança
              if (global.expenseListeners) {
                global.expenseListeners.forEach(listener => {
                  if (typeof listener === 'function') {
                    listener();
                  }
                });
              }

              Alert.alert('Sucesso', 'Despesa excluída!');
            } catch (error) {
              console.error('Erro ao excluir:', error);
              Alert.alert('Erro', 'Não foi possível excluir a despesa.');
            }
          }
        }
      ]);
    },
    [db, user, loadGroupedExpenses]
  );

  // Função para alternar expansão do grupo (memoizada)
  const toggleGroupExpansion = useCallback(date => {
    setExpandedGroups(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  }, []);

  // Renderiza item de despesa compacto (só aparece quando grupo expandido) - memoizado
  const renderExpenseItem = useCallback(
    ({ item, index, isLast }) => {
      return (
        <View style={styles.expenseCard}>
          <TouchableOpacity
            style={[styles.expenseContent, isLast && styles.expenseContentLast]}
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
                  {item.payment_method && ` • ${item.payment_icon || '💳'} ${item.payment_method}`}
                </Text>
              </View>
              <Text style={styles.expenseAmount}>{formatCurrencyLocal(item.value)}</Text>
            </View>
          </TouchableOpacity>

          {/* Botão de excluir */}
          <TouchableOpacity
            style={[styles.deleteButton, isLast && styles.deleteButtonLast]}
            onPress={() => handleDeleteExpense(item.id, item.description)}
          >
            <MaterialCommunityIcons name='delete-outline' size={18} color={NUBANK_COLORS.ERROR} />
          </TouchableOpacity>
        </View>
      );
    },
    [formatCurrencyLocal, handleDeleteExpense]
  );

  // Renderiza grupo por data com opção de expansão (memoizado)
  const renderGroup = useCallback(
    ({ item: date }) => {
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
            style={[styles.groupHeader, (!isExpanded || isEmpty) && styles.groupHeaderCollapsed]}
            onPress={() => !isEmpty && toggleGroupExpansion(date)}
            activeOpacity={isEmpty ? 1 : 0.7}
          >
            <View style={styles.groupHeaderLeft}>
              <View style={styles.groupEmojiContainer}>
                <Text style={styles.groupEmoji}>{dateFormatted.emoji}</Text>
              </View>
              <View style={styles.groupDateContainer}>
                <Text style={styles.groupDateMain}>{dateFormatted.main}</Text>
                {dateFormatted.sub && <Text style={styles.groupDateSub}>{dateFormatted.sub}</Text>}
              </View>
            </View>
            <View style={styles.groupHeaderRight}>
              {isEmpty ? (
                <View style={styles.economyContainer}>
                  <MaterialCommunityIcons
                    name='piggy-bank'
                    size={16}
                    color={NUBANK_COLORS.SUCCESS}
                    style={styles.economyIcon}
                  />
                  <Text style={styles.economyText}>R$ 0,00</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.groupTotal}>{formatCurrencyLocal(total)}</Text>
                  <View style={styles.groupMetaContainer}>
                    <Text style={styles.groupCount}>
                      {expenses.length} item{expenses.length !== 1 ? 's' : ''}
                    </Text>
                    <MaterialCommunityIcons
                      name={isExpanded ? 'chevron-down' : 'chevron-right'}
                      size={16}
                      color={NUBANK_COLORS.TEXT_SECONDARY}
                      style={styles.expandIcon}
                    />
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
            isExpanded &&
            expenses.length > 0 && (
              <FlatList
                data={expenses}
                keyExtractor={item => `grouped-expense-${item.id}`}
                renderItem={({ item, index }) =>
                  renderExpenseItem({ item, index, isLast: index === expenses.length - 1 })
                }
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            )
          )}
        </View>
      );
    },
    [
      groupedExpenses,
      expandedGroups,
      formatDateHeader,
      formatCurrencyLocal,
      toggleGroupExpansion,
      getEconomyMessage,
      renderExpenseItem
    ]
  );

  // Estados de loading e erro
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color={NUBANK_COLORS.PRIMARY} />
        <Text style={styles.loadingText}>Carregando últimos 7 dias...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons
          name='alert-circle'
          size={80}
          color={NUBANK_COLORS.ERROR}
          style={styles.errorIcon}
        />
        <Text style={styles.errorTitle}>Erro ao Carregar</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadGroupedExpenses(true)}>
          <MaterialCommunityIcons
            name='refresh'
            size={16}
            color={NUBANK_COLORS.TEXT_WHITE}
            style={styles.retryButtonIcon}
          />
          <Text style={styles.retryButtonText}>Tentar Novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const groupKeys = Object.keys(groupedExpenses);

  // Se não temos dados ainda, mostra loading
  if (groupKeys.length === 0 && !loading) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons
          name='chart-timeline-variant'
          size={80}
          color={NUBANK_COLORS.TEXT_TERTIARY}
          style={styles.emptyIcon}
        />
        <Text style={styles.emptyTitle}>Carregando últimos 7 dias</Text>
        <Text style={styles.emptySubtitle}>Seus gastos dos últimos 7 dias aparecerão aqui!</Text>
        <TouchableOpacity style={styles.debugButton} onPress={debugDatabase}>
          <MaterialCommunityIcons
            name='database-search'
            size={16}
            color={NUBANK_COLORS.TEXT_WHITE}
            style={styles.debugButtonIcon}
          />
          <Text style={styles.debugButtonText}>Verificar Banco de Dados</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header com estatísticas */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.debugButtonSmall} onPress={debugDatabase}>
            <MaterialCommunityIcons
              name='database-search'
              size={20}
              color={NUBANK_COLORS.WARNING}
            />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <MaterialCommunityIcons
              name='chart-timeline-variant'
              size={24}
              color={NUBANK_COLORS.PRIMARY}
              style={styles.headerIcon}
            />
            <Text style={styles.headerTitle}>Últimos 7 Dias</Text>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={() => loadGroupedExpenses(false)}>
            <MaterialCommunityIcons
              name={refreshing ? 'loading' : 'refresh'}
              size={20}
              color={NUBANK_COLORS.PRIMARY}
            />
          </TouchableOpacity>
        </View>

        {/* Cards de estatísticas */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsContainer}>
          <View style={styles.statCard}>
            <MaterialCommunityIcons
              name='cash-multiple'
              size={24}
              color={NUBANK_COLORS.PRIMARY}
              style={styles.statIcon}
            />
            <Text style={styles.statValue}>{formatCurrencyLocal(totalGeral)}</Text>
            <Text style={styles.statLabel}>Total 7 Dias</Text>
          </View>

          <View style={styles.statCard}>
            <MaterialCommunityIcons
              name='calendar-check'
              size={24}
              color={NUBANK_COLORS.SUCCESS}
              style={styles.statIcon}
            />
            <Text style={styles.statValue}>{totalDias}</Text>
            <Text style={styles.statLabel}>Dias com Gastos</Text>
          </View>

          <View style={styles.statCard}>
            <MaterialCommunityIcons
              name='piggy-bank'
              size={24}
              color={NUBANK_COLORS.SUCCESS}
              style={styles.statIcon}
            />
            <Text style={styles.statValue}>{7 - totalDias}</Text>
            <Text style={styles.statLabel}>Dias Economia</Text>
          </View>

          <View style={styles.statCard}>
            <MaterialCommunityIcons
              name='chart-line'
              size={24}
              color={NUBANK_COLORS.INFO}
              style={styles.statIcon}
            />
            <Text style={styles.statValue}>
              {totalDias > 0 ? formatCurrencyLocal(totalGeral / totalDias) : 'R$ 0,00'}
            </Text>
            <Text style={styles.statLabel}>Média por Dia</Text>
          </View>

          <View style={styles.statCard}>
            <MaterialCommunityIcons
              name='format-list-numbered'
              size={24}
              color={NUBANK_COLORS.TEXT_SECONDARY}
              style={styles.statIcon}
            />
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
          const dateA =
            groupedExpenses[a]?.dateInfo?.date || new Date(a.split('/').reverse().join('-'));
          const dateB =
            groupedExpenses[b]?.dateInfo?.date || new Date(b.split('/').reverse().join('-'));
          return dateB - dateA;
        })}
        keyExtractor={item => item}
        renderItem={renderGroup}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadGroupedExpenses(false)}
            colors={[NUBANK_COLORS.PRIMARY]}
            tintColor={NUBANK_COLORS.PRIMARY}
            title='Atualizando últimos 7 dias...'
            titleColor={NUBANK_COLORS.TEXT_SECONDARY}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NUBANK_COLORS.BACKGROUND_SECONDARY
  },

  // Header compacto
  header: {
    backgroundColor: NUBANK_COLORS.BACKGROUND,
    paddingTop: NUBANK_SPACING.LG,
    paddingBottom: NUBANK_SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: NUBANK_COLORS.CARD_BORDER,
    ...NUBANK_SHADOWS.SM
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: NUBANK_SPACING.LG,
    marginBottom: NUBANK_SPACING.MD
  },
  debugButtonSmall: {
    width: 40,
    height: 40,
    backgroundColor: `${NUBANK_COLORS.WARNING}20`,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${NUBANK_COLORS.WARNING}40`
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center'
  },
  headerIcon: {
    marginRight: NUBANK_SPACING.SM
  },
  headerTitle: {
    fontSize: NUBANK_FONT_SIZES.XL,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD,
    color: NUBANK_COLORS.TEXT_PRIMARY
  },
  refreshButton: {
    width: 40,
    height: 40,
    backgroundColor: `${NUBANK_COLORS.PRIMARY}10`,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${NUBANK_COLORS.PRIMARY}30`
  },

  // Cards de estatísticas compactos
  statsContainer: {
    paddingLeft: NUBANK_SPACING.LG
  },
  statCard: {
    backgroundColor: NUBANK_COLORS.CARD_BACKGROUND,
    borderRadius: NUBANK_BORDER_RADIUS.LG,
    padding: NUBANK_SPACING.MD,
    marginRight: NUBANK_SPACING.SM,
    minWidth: 110,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: NUBANK_COLORS.CARD_BORDER,
    ...NUBANK_SHADOWS.SM
  },
  statIcon: {
    marginBottom: NUBANK_SPACING.XS
  },
  statValue: {
    fontSize: NUBANK_FONT_SIZES.SM,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD,
    color: NUBANK_COLORS.PRIMARY,
    marginBottom: 2,
    textAlign: 'center'
  },
  statLabel: {
    fontSize: NUBANK_FONT_SIZES.XS,
    color: NUBANK_COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    fontWeight: NUBANK_FONT_WEIGHTS.MEDIUM
  },
  lastUpdatedText: {
    fontSize: NUBANK_FONT_SIZES.XS,
    color: NUBANK_COLORS.TEXT_TERTIARY,
    textAlign: 'center',
    marginTop: NUBANK_SPACING.SM,
    paddingHorizontal: NUBANK_SPACING.LG
  },

  // Lista compacta
  list: {
    padding: NUBANK_SPACING.MD
  },

  // Grupo por data compacto
  groupContainer: {
    backgroundColor: NUBANK_COLORS.CARD_BACKGROUND,
    borderRadius: NUBANK_BORDER_RADIUS.LG,
    marginBottom: NUBANK_SPACING.MD,
    ...NUBANK_SHADOWS.SM
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: NUBANK_SPACING.LG,
    paddingHorizontal: NUBANK_SPACING.LG,
    borderBottomWidth: 1,
    borderBottomColor: NUBANK_COLORS.CARD_BORDER
  },
  groupHeaderCollapsed: {
    borderBottomWidth: 0
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  groupEmojiContainer: {
    width: 36,
    height: 36,
    backgroundColor: `${NUBANK_COLORS.PRIMARY}10`,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: NUBANK_SPACING.MD
  },
  groupEmoji: {
    fontSize: 18
  },
  groupDateContainer: {},
  groupDateMain: {
    fontSize: NUBANK_FONT_SIZES.MD,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD,
    color: NUBANK_COLORS.TEXT_PRIMARY
  },
  groupDateSub: {
    fontSize: NUBANK_FONT_SIZES.XS,
    color: NUBANK_COLORS.TEXT_SECONDARY
  },
  groupHeaderRight: {
    alignItems: 'flex-end'
  },
  groupTotal: {
    fontSize: NUBANK_FONT_SIZES.MD,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD,
    color: NUBANK_COLORS.PRIMARY,
    marginBottom: 2
  },
  groupMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  groupCount: {
    fontSize: NUBANK_FONT_SIZES.XS,
    color: NUBANK_COLORS.TEXT_SECONDARY,
    marginRight: NUBANK_SPACING.XS
  },
  expandIcon: {
    marginLeft: NUBANK_SPACING.XS
  },

  // Economia styles
  economyContainer: {
    alignItems: 'flex-end'
  },
  economyIcon: {
    marginBottom: 2
  },
  economyText: {
    fontSize: NUBANK_FONT_SIZES.MD,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD,
    color: NUBANK_COLORS.SUCCESS
  },
  economyMessageContainer: {
    backgroundColor: `${NUBANK_COLORS.SUCCESS}10`,
    paddingVertical: NUBANK_SPACING.LG,
    paddingHorizontal: NUBANK_SPACING.LG,
    borderTopWidth: 1,
    borderTopColor: `${NUBANK_COLORS.SUCCESS}20`
  },
  economyMessage: {
    fontSize: NUBANK_FONT_SIZES.SM,
    color: NUBANK_COLORS.SUCCESS,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD,
    textAlign: 'center',
    fontStyle: 'italic'
  },

  // Cards de despesas compactos
  expenseCard: {
    backgroundColor: NUBANK_COLORS.CARD_BACKGROUND,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingLeft: 0
  },
  expenseContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: NUBANK_SPACING.SM,
    paddingHorizontal: NUBANK_SPACING.LG,
    borderBottomWidth: 1,
    borderBottomColor: NUBANK_COLORS.CARD_BORDER
  },
  expenseContentLast: {
    borderBottomWidth: 0
  },
  categoryIconContainer: {
    width: 36,
    height: 36,
    backgroundColor: `${NUBANK_COLORS.PRIMARY}10`,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: NUBANK_SPACING.MD,
    borderWidth: 1,
    borderColor: `${NUBANK_COLORS.PRIMARY}20`
  },
  categoryIcon: {
    fontSize: 16
  },
  expenseInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  expenseLeft: {
    flex: 1
  },
  expenseDescription: {
    fontSize: NUBANK_FONT_SIZES.SM,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD,
    color: NUBANK_COLORS.TEXT_PRIMARY,
    marginBottom: 2
  },
  expenseCategory: {
    fontSize: NUBANK_FONT_SIZES.XS,
    color: NUBANK_COLORS.TEXT_SECONDARY,
    flexWrap: 'wrap'
  },
  expenseAmount: {
    fontSize: NUBANK_FONT_SIZES.SM,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD,
    color: NUBANK_COLORS.PRIMARY,
    marginLeft: NUBANK_SPACING.SM
  },

  // Botão de delete compacto
  deleteButton: {
    backgroundColor: `${NUBANK_COLORS.ERROR}10`,
    justifyContent: 'center',
    alignItems: 'center',
    width: 48,
    height: 64,
    borderBottomWidth: 1,
    borderBottomColor: NUBANK_COLORS.CARD_BORDER
  },
  deleteButtonLast: {
    borderBottomWidth: 0
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: NUBANK_SPACING.XXL
  },
  emptyIcon: {
    marginBottom: NUBANK_SPACING.LG,
    opacity: 0.4
  },
  emptyTitle: {
    fontSize: NUBANK_FONT_SIZES.XL,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD,
    color: NUBANK_COLORS.TEXT_PRIMARY,
    marginBottom: NUBANK_SPACING.SM
  },
  emptySubtitle: {
    fontSize: NUBANK_FONT_SIZES.MD,
    color: NUBANK_COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: NUBANK_SPACING.XL
  },
  debugButton: {
    backgroundColor: NUBANK_COLORS.WARNING,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: NUBANK_SPACING.LG,
    paddingVertical: NUBANK_SPACING.SM,
    borderRadius: NUBANK_BORDER_RADIUS.LG,
    ...NUBANK_SHADOWS.SM
  },
  debugButtonIcon: {
    marginRight: NUBANK_SPACING.XS
  },
  debugButtonText: {
    color: NUBANK_COLORS.TEXT_WHITE,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD,
    fontSize: NUBANK_FONT_SIZES.SM
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: NUBANK_COLORS.BACKGROUND_SECONDARY
  },
  loadingText: {
    marginTop: NUBANK_SPACING.MD,
    color: NUBANK_COLORS.TEXT_SECONDARY,
    fontSize: NUBANK_FONT_SIZES.MD,
    fontWeight: NUBANK_FONT_WEIGHTS.MEDIUM
  },

  // Error state
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: NUBANK_SPACING.XXL,
    backgroundColor: NUBANK_COLORS.BACKGROUND_SECONDARY
  },
  errorIcon: {
    marginBottom: NUBANK_SPACING.LG,
    opacity: 0.6
  },
  errorTitle: {
    fontSize: NUBANK_FONT_SIZES.XL,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD,
    color: NUBANK_COLORS.ERROR,
    marginBottom: NUBANK_SPACING.SM
  },
  errorMessage: {
    fontSize: NUBANK_FONT_SIZES.MD,
    color: NUBANK_COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: NUBANK_SPACING.XL
  },
  retryButton: {
    backgroundColor: NUBANK_COLORS.PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: NUBANK_SPACING.XL,
    paddingVertical: NUBANK_SPACING.MD,
    borderRadius: NUBANK_BORDER_RADIUS.LG,
    ...NUBANK_SHADOWS.SM
  },
  retryButtonIcon: {
    marginRight: NUBANK_SPACING.XS
  },
  retryButtonText: {
    color: NUBANK_COLORS.TEXT_WHITE,
    fontSize: NUBANK_FONT_SIZES.MD,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD
  }
});

export default GroupedExpenseList;
