// screens/ProfileScreen.js - VERSÃO CORRIGIDA SEM HOOKS INEXISTENTES
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ScrollView,
  StatusBar,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { useAuth } from '../services/AuthContext';
import { useSQLiteContext } from 'expo-sqlite';
import { formatCurrency } from '../utils/helpers';

export default function ProfileScreen() {
  const { user, logout, updateProfile } = useAuth();
  const db = useSQLiteContext();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);

  // Estados para estatísticas
  const [stats, setStats] = useState({
    totalDespesas: 0,
    totalCategorias: 0,
    totalEstabelecimentos: 0,
    totalMes: 0,
    totalAno: 0,
    mediaMensal: 0,
    categoriaFavorita: null,
    estabelecimentoFavorito: null,
    primeiraDespesa: null,
    ultimaDespesa: null
  });

  // Atualiza o nome quando o usuário muda
  useEffect(() => {
    setName(user?.name || '');
  }, [user]);

  // Carrega estatísticas quando o componente monta
  useEffect(() => {
    if (db && user) {
      loadStats();
    }
  }, [db, user]);

  const loadStats = useCallback(async () => {
    if (!db || !user?.id) return;

    try {
      setLoadingStats(true);
      console.log('🔍 Carregando estatísticas do usuário:', user.id);

      // 1. Total de despesas
      const despesasResult = await db.getFirstAsync(
        'SELECT COUNT(*) as total FROM expenses WHERE user_id = ?',
        [user.id]
      );
      const totalDespesas = despesasResult?.total || 0;

      // 2. Total de categorias
      const categoriasResult = await db.getFirstAsync(
        'SELECT COUNT(*) as total FROM categories WHERE user_id = ?',
        [user.id]
      );
      const totalCategorias = categoriasResult?.total || 0;

      // 3. Total de estabelecimentos
      const estabelecimentosResult = await db.getFirstAsync(
        'SELECT COUNT(*) as total FROM establishments WHERE user_id = ?',
        [user.id]
      );
      const totalEstabelecimentos = estabelecimentosResult?.total || 0;

      // 4. Total do mês atual
      const mesAtualResult = await db.getFirstAsync(
        `SELECT COALESCE(SUM(CAST(amount AS REAL)), 0) as total 
         FROM expenses 
         WHERE user_id = ? 
         AND strftime('%Y-%m', date) = strftime('%Y-%m', 'now')`,
        [user.id]
      );
      const totalMes = mesAtualResult?.total || 0;

      // 5. Total do ano atual
      const anoAtualResult = await db.getFirstAsync(
        `SELECT COALESCE(SUM(CAST(amount AS REAL)), 0) as total 
         FROM expenses 
         WHERE user_id = ? 
         AND strftime('%Y', date) = strftime('%Y', 'now')`,
        [user.id]
      );
      const totalAno = anoAtualResult?.total || 0;

      // 6. Média mensal (últimos 12 meses)
      const mediaResult = await db.getFirstAsync(
        `SELECT COALESCE(AVG(monthly_total), 0) as media
         FROM (
           SELECT SUM(CAST(amount AS REAL)) as monthly_total
           FROM expenses
           WHERE user_id = ?
           AND date >= date('now', '-12 months')
           GROUP BY strftime('%Y-%m', date)
         )`,
        [user.id]
      );
      const mediaMensal = mediaResult?.media || 0;

      // 7. Categoria favorita
      let categoriaFavorita = null;
      const categoriaFavResult = await db.getFirstAsync(
        `SELECT c.id, c.name, c.icon, COUNT(e.id) as uso
         FROM expenses e
         JOIN categories c ON e.categoryId = c.id
         WHERE e.user_id = ?
         GROUP BY c.id
         ORDER BY uso DESC
         LIMIT 1`,
        [user.id]
      );
      if (categoriaFavResult) {
        categoriaFavorita = {
          id: categoriaFavResult.id,
          name: categoriaFavResult.name,
          icon: categoriaFavResult.icon
        };
      }

      // 8. Estabelecimento favorito
      let estabelecimentoFavorito = null;
      const estabelecimentoFavResult = await db.getFirstAsync(
        `SELECT est.id, est.name, COUNT(e.id) as visitas
         FROM expenses e
         JOIN establishments est ON e.establishment_id = est.id
         WHERE e.user_id = ?
         GROUP BY est.id
         ORDER BY visitas DESC
         LIMIT 1`,
        [user.id]
      );
      if (estabelecimentoFavResult) {
        estabelecimentoFavorito = {
          id: estabelecimentoFavResult.id,
          name: estabelecimentoFavResult.name
        };
      }

      // 9. Primeira e última despesa
      const primeiraResult = await db.getFirstAsync(
        `SELECT id, description, amount, date
         FROM expenses
         WHERE user_id = ?
         ORDER BY date ASC, id ASC
         LIMIT 1`,
        [user.id]
      );

      const ultimaResult = await db.getFirstAsync(
        `SELECT id, description, amount, date
         FROM expenses
         WHERE user_id = ?
         ORDER BY date DESC, id DESC
         LIMIT 1`,
        [user.id]
      );

      // Atualiza o estado com todas as estatísticas
      setStats({
        totalDespesas,
        totalCategorias,
        totalEstabelecimentos,
        totalMes,
        totalAno,
        mediaMensal,
        categoriaFavorita,
        estabelecimentoFavorito,
        primeiraDespesa: primeiraResult || null,
        ultimaDespesa: ultimaResult || null
      });

      console.log('✅ Estatísticas carregadas com sucesso');
    } catch (error) {
      console.error('❌ Erro ao carregar estatísticas:', error);
      Alert.alert('Erro', 'Não foi possível carregar as estatísticas');
    } finally {
      setLoadingStats(false);
    }
  }, [db, user]);

  const handleLogout = () => {
    Alert.alert('Confirmar Saída', 'Deseja realmente sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          const result = await logout();
          if (!result.success) {
            Alert.alert('Erro', 'Não foi possível fazer logout');
          }
        }
      }
    ]);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Nome não pode estar vazio');
      return;
    }

    const result = await updateProfile({ name: name.trim() });
    if (result.success) {
      setEditing(false);
      Alert.alert('Sucesso', 'Perfil atualizado!');
    } else {
      Alert.alert('Erro', 'Não foi possível atualizar o perfil');
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  }, [loadStats]);

  const formatDateLocal = dateString => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  };

  const formatDateTimeLocal = dateString => {
    if (!dateString) return 'N/A';
    try {
      return (
        new Date(dateString).toLocaleDateString('pt-BR') +
        ' às ' +
        new Date(dateString).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        })
      );
    } catch {
      return dateString;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle='light-content' backgroundColor='#6366F1' />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Header do Perfil */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || '?'}</Text>
          </View>

          {editing ? (
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder='Seu nome'
              autoFocus
              returnKeyType='done'
              onSubmitEditing={handleSave}
            />
          ) : (
            <Text style={styles.name}>{user?.name}</Text>
          )}

          <Text style={styles.email}>{user?.email}</Text>
        </View>

        {/* Informações da Conta */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações da Conta</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>📅 Membro desde</Text>
            <Text style={styles.infoValue}>{formatDateLocal(user?.created_at)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>🔐 Último acesso</Text>
            <Text style={[styles.infoValue, styles.lastLoginValue]}>
              {formatDateTimeLocal(user?.last_login)}
            </Text>
          </View>

          <View style={[styles.infoRow, styles.lastInfoRow]}>
            <Text style={styles.infoLabel}>📧 Email</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>
        </View>

        {/* Estatísticas Principais */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Suas Estatísticas</Text>

          {loadingStats ? (
            <View style={styles.loadingStats}>
              <ActivityIndicator size='small' color='#6366F1' />
              <Text style={styles.loadingText}>Calculando estatísticas...</Text>
            </View>
          ) : (
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.totalDespesas}</Text>
                <Text style={styles.statLabel}>Despesas</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.totalCategorias}</Text>
                <Text style={styles.statLabel}>Categorias</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.totalEstabelecimentos}</Text>
                <Text style={styles.statLabel}>Locais</Text>
              </View>
            </View>
          )}
        </View>

        {/* Estatísticas Financeiras */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo Financeiro</Text>

          {loadingStats ? (
            <View style={styles.loadingStats}>
              <ActivityIndicator size='small' color='#6366F1' />
            </View>
          ) : (
            <>
              <View style={styles.financialRow}>
                <Text style={styles.financialLabel}>💰 Total este mês</Text>
                <Text style={[styles.financialValue, styles.currentMonth]}>
                  {formatCurrency(stats.totalMes)}
                </Text>
              </View>

              <View style={styles.financialRow}>
                <Text style={styles.financialLabel}>📊 Total este ano</Text>
                <Text style={styles.financialValue}>{formatCurrency(stats.totalAno)}</Text>
              </View>

              <View style={[styles.financialRow, styles.lastFinancialRow]}>
                <Text style={styles.financialLabel}>📈 Média mensal</Text>
                <Text style={styles.financialValue}>{formatCurrency(stats.mediaMensal)}</Text>
              </View>
            </>
          )}
        </View>

        {/* Estatísticas Detalhadas */}
        {!loadingStats && (stats.categoriaFavorita || stats.estabelecimentoFavorito) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Seus Favoritos</Text>

            {stats.categoriaFavorita && (
              <View style={styles.favoriteRow}>
                <Text style={styles.favoriteLabel}>
                  {stats.categoriaFavorita.icon || '📂'} Categoria mais usada
                </Text>
                <Text style={styles.favoriteValue}>{stats.categoriaFavorita.name}</Text>
              </View>
            )}

            {stats.estabelecimentoFavorito && (
              <View
                style={[styles.favoriteRow, stats.categoriaFavorita ? {} : styles.lastFavoriteRow]}
              >
                <Text style={styles.favoriteLabel}>🏪 Local favorito</Text>
                <Text style={styles.favoriteValue}>{stats.estabelecimentoFavorito.name}</Text>
              </View>
            )}
          </View>
        )}

        {/* Histórico de Atividade */}
        {!loadingStats && (stats.primeiraDespesa || stats.ultimaDespesa) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Histórico</Text>

            {stats.primeiraDespesa && (
              <View style={styles.historyRow}>
                <Text style={styles.historyLabel}>🎯 Primeira despesa</Text>
                <Text style={styles.historyValue}>
                  {formatDateLocal(stats.primeiraDespesa.date)}
                </Text>
                <Text style={styles.historyDescription}>
                  {stats.primeiraDespesa.description} -{' '}
                  {formatCurrency(stats.primeiraDespesa.amount)}
                </Text>
              </View>
            )}

            {stats.ultimaDespesa && (
              <View style={[styles.historyRow, stats.primeiraDespesa ? {} : styles.lastHistoryRow]}>
                <Text style={styles.historyLabel}>⏰ Última despesa</Text>
                <Text style={styles.historyValue}>{formatDateLocal(stats.ultimaDespesa.date)}</Text>
                <Text style={styles.historyDescription}>
                  {stats.ultimaDespesa.description} - {formatCurrency(stats.ultimaDespesa.amount)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Ações */}
        <View style={styles.actions}>
          {editing ? (
            <>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>💾 Salvar Alterações</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setName(user?.name || '');
                  setEditing(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.editButton} onPress={() => setEditing(true)}>
              <Text style={styles.editButtonText}>✏️ Editar Perfil</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>🚪 Sair da Conta</Text>
          </TouchableOpacity>

          {/* Espaço extra para afastar o botão do rodapé */}
          <View style={{ height: 80 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  header: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  avatarText: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '700'
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4
  },
  nameInput: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    borderBottomWidth: 2,
    borderBottomColor: '#6366F1',
    paddingBottom: 4,
    marginBottom: 4,
    textAlign: 'center',
    minWidth: 200
  },
  email: {
    fontSize: 16,
    color: '#6B7280'
  },
  section: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  lastInfoRow: {
    borderBottomWidth: 0
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280'
  },
  infoValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right'
  },
  lastLoginValue: {
    fontSize: 13,
    flexWrap: 'wrap'
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6366F1',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center'
  },
  loadingStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280'
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  lastFinancialRow: {
    borderBottomWidth: 0
  },
  financialLabel: {
    fontSize: 14,
    color: '#6B7280'
  },
  financialValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600'
  },
  currentMonth: {
    color: '#10B981',
    fontWeight: '700'
  },
  favoriteRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  lastFavoriteRow: {
    borderBottomWidth: 0
  },
  favoriteLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4
  },
  favoriteValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600'
  },
  historyRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  lastHistoryRow: {
    borderBottomWidth: 0
  },
  historyLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4
  },
  historyValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
    marginBottom: 2
  },
  historyDescription: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic'
  },
  actions: {
    padding: 16,
    gap: 12
  },
  editButton: {
    backgroundColor: '#6366F1',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  saveButton: {
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600'
  },
  logoutButton: {
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8
  },
  logoutButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600'
  }
});
