// components/ExpenseManager.js - VERSÃO COMPLETA COM ESTABELECIMENTO
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { formatCurrency, formatDate } from '../utils/helpers';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../services/AuthContext';

export default function ExpenseManager() {
  const db = useSQLiteContext();
  const { user } = useAuth();
  
  // Estados principais
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [establishments, setEstablishments] = useState([]); // NOVO
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [isLoadingMethods, setIsLoadingMethods] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingEstablishments, setIsLoadingEstablishments] = useState(true); // NOVO
  
  // Estados do formulário
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [selectedEstablishment, setSelectedEstablishment] = useState(null); // NOVO
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Estados de filtro
  const [filterCategory, setFilterCategory] = useState(null);
  const [searchText, setSearchText] = useState('');

  // Carrega dados iniciais
  useEffect(() => {
    console.log('🔄 useEffect principal - db:', !!db, 'user:', !!user);
    if (db && user) {
      loadAllData();
    }
  }, [db, user]);

  // Carrega dados quando o modal abre
  useEffect(() => {
    if (modalVisible && db && user) {
      console.log('📱 Modal aberto - recarregando dados...');
      loadPaymentMethodsWithRetry();
      loadCategoriesWithRetry();
      loadEstablishments(); // NOVO
    }
  }, [modalVisible, db, user]);

  const loadAllData = useCallback(async () => {
    try {
      console.log('📊 === CARREGANDO TODOS OS DADOS ===');
      setLoading(true);
      
      await Promise.all([
        loadExpenses(),
        loadCategories(),
        loadPaymentMethods(),
        loadEstablishments() // NOVO
      ]);
      
      console.log('✅ Todos os dados carregados com sucesso');
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadExpenses = async () => {
    try {
      console.log('💰 Carregando despesas...');
      const results = await db.getAllAsync(`
        SELECT 
          e.*,
          c.name as categoryName,
          c.icon as categoryIcon,
          pm.name as paymentMethodName,
          pm.icon as paymentMethodIcon,
          est.name as establishmentName
        FROM expenses e
        LEFT JOIN categories c ON e.categoryId = c.id
        LEFT JOIN payment_methods pm ON e.payment_method_id = pm.id
        LEFT JOIN establishments est ON e.establishment_id = est.id
        WHERE e.user_id = ?
        ORDER BY e.date DESC, e.id DESC
      `, [user.id]);
      
      console.log('📊 Despesas carregadas:', results.length);
      setExpenses(results || []);
    } catch (error) {
      console.error('❌ Erro ao carregar despesas:', error);
      setExpenses([]);
    }
  };

  const loadCategories = async () => {
    try {
      console.log('📂 Carregando categorias do usuário:', user.id);
      
      const results = await db.getAllAsync(
        'SELECT * FROM categories WHERE user_id = ? ORDER BY name',
        [user.id]
      );
      
      console.log('📂 Categorias carregadas:', results?.length || 0);
      if (results && results.length > 0) {
        console.log('📂 Primeira categoria:', results[0]);
      }
      
      setCategories(results || []);
      setIsLoadingCategories(false);
    } catch (error) {
      console.error('❌ Erro ao carregar categorias:', error);
      setCategories([]);
      setIsLoadingCategories(false);
    }
  };

  const loadPaymentMethods = async () => {
    try {
      console.log('💳 === CARREGANDO MÉTODOS DE PAGAMENTO ===');
      console.log('👤 User ID:', user?.id);
      
      if (!user || !user.id) {
        console.error('❌ Usuário não definido');
        return;
      }
      
      const userMethods = await db.getAllAsync(
        'SELECT * FROM payment_methods WHERE user_id = ? ORDER BY name',
        [user.id]
      );
      
      console.log('💳 Métodos do usuário encontrados:', userMethods?.length || 0);
      if (userMethods && userMethods.length > 0) {
        console.log('💳 Exemplo:', userMethods[0]);
      }
      
      setPaymentMethods(userMethods || []);
      setIsLoadingMethods(false);
      
    } catch (error) {
      console.error('❌ Erro ao carregar métodos:', error);
      setPaymentMethods([]);
      setIsLoadingMethods(false);
    }
  };

  // NOVA FUNÇÃO
  const loadEstablishments = async () => {
    try {
      console.log('🏪 Carregando estabelecimentos do usuário:', user.id);
      
      const results = await db.getAllAsync(
        'SELECT * FROM establishments WHERE user_id = ? ORDER BY name',
        [user.id]
      );
      
      console.log('🏪 Estabelecimentos carregados:', results?.length || 0);
      setEstablishments(results || []);
      setIsLoadingEstablishments(false);
    } catch (error) {
      console.error('❌ Erro ao carregar estabelecimentos:', error);
      setEstablishments([]);
      setIsLoadingEstablishments(false);
    }
  };

  // Função com retry para carregar métodos
  const loadPaymentMethodsWithRetry = async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`🔄 Tentativa ${i + 1} de carregar métodos...`);
        await loadPaymentMethods();
        break;
      } catch (error) {
        console.error(`❌ Erro na tentativa ${i + 1}:`, error);
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
  };

  // Função com retry para carregar categorias
  const loadCategoriesWithRetry = async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`🔄 Tentativa ${i + 1} de carregar categorias...`);
        await loadCategories();
        break;
      } catch (error) {
        console.error(`❌ Erro na tentativa ${i + 1}:`, error);
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadAllData().finally(() => setRefreshing(false));
  }, [loadAllData]);

  const openModal = (expense = null) => {
    console.log('📝 Abrindo modal...', expense ? 'Edição' : 'Nova despesa');
    
    if (expense) {
      setEditingExpense(expense);
      setAmount(expense.amount.toString().replace('.', ','));
      setDescription(expense.description);
      setSelectedCategory(expense.categoryId);
      setSelectedPaymentMethod(expense.payment_method_id);
      setSelectedEstablishment(expense.establishment_id); // NOVO
      setSelectedDate(new Date(expense.date));
    } else {
      resetForm();
    }
    
    setModalVisible(true);
  };

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setSelectedCategory(null);
    setSelectedPaymentMethod(null);
    setSelectedEstablishment(null); // NOVO
    setSelectedDate(new Date());
    setEditingExpense(null);
  };

  const validateForm = () => {
    if (!amount || !description.trim()) {
      Alert.alert('Erro', 'Por favor, preencha o valor e a descrição');
      return false;
    }
    
    const numericValue = parseFloat(amount.replace(',', '.'));
    if (isNaN(numericValue) || numericValue <= 0) {
      Alert.alert('Erro', 'Por favor, insira um valor válido');
      return false;
    }
    
    if (!selectedCategory) {
      Alert.alert('Erro', 'Por favor, selecione uma categoria');
      return false;
    }
    
    if (!selectedPaymentMethod) {
      Alert.alert('Erro', 'Por favor, selecione uma forma de pagamento');
      return false;
    }
    
    return true;
  };

  const saveExpense = async () => {
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      
      const valor = parseFloat(amount.replace(',', '.'));
      const cleanDescription = description.trim();
      const dateISO = selectedDate.toISOString();
      
      console.log('💾 Salvando despesa:', {
        valor,
        cleanDescription,
        selectedCategory,
        selectedPaymentMethod,
        selectedEstablishment, // NOVO
        dateISO,
        userId: user.id
      });
      
      if (editingExpense) {
        await db.runAsync(
          `UPDATE expenses 
           SET amount = ?, 
               description = ?, 
               categoryId = ?, 
               payment_method_id = ?, 
               establishment_id = ?,
               date = ?
           WHERE id = ? AND user_id = ?`,
          [valor, cleanDescription, selectedCategory, selectedPaymentMethod, 
           selectedEstablishment, dateISO, editingExpense.id, user.id]
        );
        
        Alert.alert('Sucesso', 'Despesa atualizada com sucesso!');
      } else {
        const result = await db.runAsync(
          `INSERT INTO expenses (amount, description, categoryId, payment_method_id, establishment_id, date, user_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [valor, cleanDescription, selectedCategory, selectedPaymentMethod, selectedEstablishment, dateISO, user.id]
        );
        
        console.log('✅ Despesa inserida com ID:', result.lastInsertRowId);
        Alert.alert('Sucesso', 'Despesa cadastrada com sucesso!');
      }
      
      // Notifica outros componentes
      if (global.expenseListeners) {
        global.expenseListeners.forEach(listener => listener());
      }
      
      setModalVisible(false);
      resetForm();
      await loadExpenses();
      
    } catch (error) {
      console.error('❌ Erro ao salvar despesa:', error);
      Alert.alert('Erro', 'Não foi possível salvar a despesa: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteExpense = async (id) => {
    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir esta despesa?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await db.runAsync(
                'DELETE FROM expenses WHERE id = ? AND user_id = ?',
                [id, user.id]
              );
              
              Alert.alert('Sucesso', 'Despesa excluída com sucesso!');
              
              if (global.expenseListeners) {
                global.expenseListeners.forEach(listener => listener());
              }
              
              await loadExpenses();
            } catch (error) {
              console.error('Erro ao excluir despesa:', error);
              Alert.alert('Erro', 'Não foi possível excluir a despesa');
            }
          }
        }
      ]
    );
  };

  // Filtra despesas
  const filteredExpenses = expenses.filter(expense => {
    const matchesCategory = !filterCategory || expense.categoryId === filterCategory;
    const matchesSearch = !searchText || 
      expense.description.toLowerCase().includes(searchText.toLowerCase()) ||
      expense.categoryName?.toLowerCase().includes(searchText.toLowerCase()) ||
      expense.establishmentName?.toLowerCase().includes(searchText.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  // Calcula total filtrado
  const totalFiltered = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  // RENDERIZAÇÃO DO ITEM ATUALIZADA
  const renderExpenseItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.expenseItem}
      onPress={() => openModal(item)}
      onLongPress={() => deleteExpense(item.id)}
      activeOpacity={0.7}
    >
      {/* Ícone da Categoria */}
      <View style={styles.expenseIcon}>
        <Text style={styles.iconText}>{item.categoryIcon || '💰'}</Text>
      </View>
      
      {/* Informações da Despesa */}
      <View style={styles.expenseInfo}>
        {/* Descrição */}
        <Text style={styles.expenseDescription} numberOfLines={1}>
          {item.description}
        </Text>
        
        {/* Categoria */}
        <View style={styles.expenseMetadata}>
          <Text style={styles.expenseCategory}>
            {item.categoryName || 'Sem categoria'}
          </Text>
        </View>
        
        {/* Método de Pagamento */}
        {item.paymentMethodName && (
          <View style={styles.expenseMetadata}>
            <View style={styles.paymentMethodTag}>
              <Text style={styles.paymentMethodIcon}>
                {item.paymentMethodIcon || '💳'}
              </Text>
              <Text style={styles.paymentMethodText}>
                {item.paymentMethodName}
              </Text>
            </View>
          </View>
        )}
        
        {/* Estabelecimento - NOVO */}
        {item.establishmentName && (
          <View style={styles.expenseMetadata}>
            <Text style={styles.establishmentText}>
              📍 {item.establishmentName}
            </Text>
          </View>
        )}
      </View>
      
      {/* Valor e Data */}
      <View style={styles.expenseAmount}>
        <Text style={styles.expenseValue}>
          {formatCurrency(item.amount)}
        </Text>
        <Text style={styles.expenseDate}>
          {formatDate(item.date)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📊</Text>
      <Text style={styles.emptyTitle}>Nenhuma despesa encontrada</Text>
      <Text style={styles.emptyText}>
        {searchText || filterCategory
          ? 'Tente ajustar os filtros'
          : 'Toque no botão + para adicionar sua primeira despesa'}
      </Text>
    </View>
  );

  const renderDatePicker = () => {
    const today = new Date();
    const dates = [];
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      dates.push(date);
    }
    
    return (
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <TouchableOpacity 
          style={styles.datePickerOverlay}
          activeOpacity={1}
          onPress={() => setShowDatePicker(false)}
        >
          <View style={styles.datePickerContainer}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>Selecione a Data</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.datePickerClose}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.datePickerScroll}>
              {dates.map((date, index) => {
                const isSelected = selectedDate.toDateString() === date.toDateString();
                const isToday = today.toDateString() === date.toDateString();
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dateOption,
                      isSelected && styles.dateOptionSelected,
                      isToday && styles.dateOptionToday
                    ]}
                    onPress={() => {
                      setSelectedDate(date);
                      setShowDatePicker(false);
                    }}
                  >
                    <Text style={[
                      styles.dateOptionText,
                      isSelected && styles.dateOptionTextSelected
                    ]}>
                      {isToday ? 'Hoje - ' : ''}
                      {date.toLocaleDateString('pt-BR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long'
                      })}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  if (loading && expenses.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Carregando despesas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filtros */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <TouchableOpacity
            style={[styles.filterChip, !filterCategory && styles.filterChipActive]}
            onPress={() => setFilterCategory(null)}
          >
            <Text style={[styles.filterChipText, !filterCategory && styles.filterChipTextActive]}>
              Todas Categorias
            </Text>
          </TouchableOpacity>
          
          {categories.map(category => (
            <TouchableOpacity
              key={category.id}
              style={[styles.filterChip, filterCategory === category.id && styles.filterChipActive]}
              onPress={() => setFilterCategory(filterCategory === category.id ? null : category.id)}
            >
              <Text style={[styles.filterChipText, filterCategory === category.id && styles.filterChipTextActive]}>
                {category.icon} {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Barra de pesquisa */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Pesquisar despesas..."
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText.length > 0 && (
          <TouchableOpacity
            style={styles.searchClear}
            onPress={() => setSearchText('')}
          >
            <Text style={styles.searchClearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Total */}
      {filteredExpenses.length > 0 && (
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalValue}>{formatCurrency(totalFiltered)}</Text>
          <Text style={styles.totalCount}>({filteredExpenses.length} despesas)</Text>
        </View>
      )}

      {/* Lista de despesas */}
      <FlatList
        data={filteredExpenses}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderExpenseItem}
        ListEmptyComponent={renderEmptyList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#6366F1']}
            tintColor="#6366F1"
          />
        }
        contentContainerStyle={styles.listContent}
      />

      {/* Botão flutuante */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => openModal()}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Modal de adicionar/editar */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingExpense ? 'Editar Despesa' : 'Nova Despesa'}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalClose}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Campo Valor */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>💰 Valor *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0,00"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                  autoFocus
                />
              </View>

              {/* Campo Descrição */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>📝 Descrição *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Almoço, Combustível, etc"
                  value={description}
                  onChangeText={setDescription}
                />
              </View>

              {/* Seletor de Categoria */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>📂 Categoria *</Text>
                {isLoadingCategories ? (
                  <View style={styles.emptySelector}>
                    <ActivityIndicator size="small" color="#6366F1" />
                    <Text style={styles.emptySelectorText}>Carregando categorias...</Text>
                  </View>
                ) : categories.length === 0 ? (
                  <View style={styles.emptySelector}>
                    <Text style={styles.emptySelectorText}>
                      Nenhuma categoria cadastrada
                    </Text>
                    <TouchableOpacity 
                      style={styles.goToButton}
                      onPress={() => {
                        setModalVisible(false);
                        Alert.alert(
                          'Criar Categoria',
                          'Vá para o menu Categorias para criar suas categorias personalizadas.'
                        );
                      }}
                    >
                      <Text style={styles.goToButtonText}>Ir para Categorias</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={selectedCategory}
                      onValueChange={(value) => {
                        console.log('📂 Categoria selecionada:', value);
                        setSelectedCategory(value);
                      }}
                      style={styles.picker}
                    >
                      <Picker.Item label="Selecione uma categoria" value={null} />
                      {categories.map(category => (
                        <Picker.Item
                          key={category.id}
                          label={`${category.icon} ${category.name}`}
                          value={category.id}
                        />
                      ))}
                    </Picker>
                  </View>
                )}
              </View>

              {/* Seletor de Método de Pagamento */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>💳 Forma de Pagamento *</Text>
                {isLoadingMethods ? (
                  <View style={styles.emptySelector}>
                    <ActivityIndicator size="small" color="#6366F1" />
                    <Text style={styles.emptySelectorText}>Carregando formas de pagamento...</Text>
                  </View>
                ) : paymentMethods.length === 0 ? (
                  <View style={styles.emptySelector}>
                    <Text style={styles.emptySelectorText}>
                      Nenhuma forma de pagamento cadastrada
                    </Text>
                    <TouchableOpacity 
                      style={styles.goToButton}
                      onPress={() => {
                        setModalVisible(false);
                        Alert.alert(
                          'Criar Forma de Pagamento',
                          'Vá para o menu Formas de Pagamento para criar suas opções.'
                        );
                      }}
                    >
                      <Text style={styles.goToButtonText}>Ir para Formas de Pagamento</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={selectedPaymentMethod}
                      onValueChange={(value) => {
                        console.log('💳 Método selecionado:', value);
                        setSelectedPaymentMethod(value);
                      }}
                      style={styles.picker}
                    >
                      <Picker.Item label="Selecione forma de pagamento" value={null} />
                      {paymentMethods.map(method => (
                        <Picker.Item
                          key={method.id}
                          label={`${method.icon} ${method.name}`}
                          value={method.id}
                        />
                      ))}
                    </Picker>
                  </View>
                )}
              </View>

              {/* Seletor de Estabelecimento (OPCIONAL) - NOVO */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>🏪 Estabelecimento (opcional)</Text>
                {isLoadingEstablishments ? (
                  <View style={styles.emptySelector}>
                    <ActivityIndicator size="small" color="#6366F1" />
                    <Text style={styles.emptySelectorText}>Carregando estabelecimentos...</Text>
                  </View>
                ) : (
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={selectedEstablishment}
                      onValueChange={(value) => {
                        console.log('🏪 Estabelecimento selecionado:', value);
                        setSelectedEstablishment(value);
                      }}
                      style={styles.picker}
                    >
                      <Picker.Item label="Nenhum estabelecimento" value={null} />
                      {establishments.map(establishment => (
                        <Picker.Item
                          key={establishment.id}
                          label={`${establishment.name}${establishment.district ? ` - ${establishment.district}` : ''}`}
                          value={establishment.id}
                        />
                      ))}
                    </Picker>
                    {establishments.length === 0 && (
                      <TouchableOpacity 
                        style={styles.createEstablishmentHint}
                        onPress={() => {
                          setModalVisible(false);
                          Alert.alert(
                            'Cadastrar Estabelecimento',
                            'Você pode cadastrar estabelecimentos no menu lateral.',
                            [{ text: 'OK' }]
                          );
                        }}
                      >
                        <Text style={styles.createEstablishmentText}>
                          💡 Cadastre estabelecimentos para facilitar o controle
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>

              {/* Seletor de Data */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>📅 Data</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.dateButtonText}>
                    {selectedDate.toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Preview da despesa */}
              {amount && description && selectedCategory && selectedPaymentMethod && (
                <View style={styles.previewContainer}>
                  <Text style={styles.previewTitle}>Prévia:</Text>
                  <View style={styles.previewCard}>
                    <Text style={styles.previewAmount}>{formatCurrency(parseFloat(amount.replace(',', '.')) || 0)}</Text>
                    <Text style={styles.previewDescription}>{description}</Text>
                    <Text style={styles.previewDetails}>
                      {categories.find(c => c.id === selectedCategory)?.icon} {categories.find(c => c.id === selectedCategory)?.name}
                      {' • '}
                      {paymentMethods.find(m => m.id === selectedPaymentMethod)?.icon} {paymentMethods.find(m => m.id === selectedPaymentMethod)?.name}
                    </Text>
                    {/* NOVO - Preview do estabelecimento */}
                    {selectedEstablishment && (
                      <Text style={styles.previewEstablishment}>
                        📍 {establishments.find(e => e.id === selectedEstablishment)?.name}
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, loading && styles.buttonDisabled]}
                onPress={saveExpense}
                disabled={loading || isLoadingCategories || isLoadingMethods}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingExpense ? 'Atualizar' : 'Salvar'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal de seleção de data */}
      {renderDatePicker()}
    </View>
  );
}

// ESTILOS COMPLETOS
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterScroll: {
    paddingHorizontal: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#6366F1',
  },
  filterChipText: {
    fontSize: 14,
    color: '#4B5563',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
  },
  searchClear: {
    marginLeft: 8,
    padding: 8,
  },
  searchClearText: {
    fontSize: 18,
    color: '#6B7280',
  },
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    color: '#4B5563',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6366F1',
    marginLeft: 8,
  },
  totalCount: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 100,
  },
  
  // ESTILOS DO CARD DE DESPESA
  expenseItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  expenseIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  iconText: {
    fontSize: 26,
  },
  expenseInfo: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 12,
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  expenseMetadata: {
    marginBottom: 2,
  },
  expenseCategory: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  paymentMethodTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignSelf: 'flex-start',
  },
  paymentMethodIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  paymentMethodText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  establishmentText: { // NOVO
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginTop: 2,
  },
  expenseAmount: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 80,
  },
  expenseValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 4,
  },
  expenseDate: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  
  // ESTILOS DO MODAL
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
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
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalClose: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 24,
    color: '#6B7280',
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  emptySelector: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
  },
  emptySelectorText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  goToButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  goToButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  createEstablishmentHint: { // NOVO
    padding: 12,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    marginTop: 8,
  },
  createEstablishmentText: { // NOVO
    fontSize: 12,
    color: '#3B82F6',
    textAlign: 'center',
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F9FAFB',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#1F2937',
  },
  previewContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  previewCard: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
  },
  previewAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 4,
  },
  previewDescription: {
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 4,
  },
  previewDetails: {
    fontSize: 14,
    color: '#6B7280',
  },
  previewEstablishment: { // NOVO
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
    fontStyle: 'italic',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
  },
  saveButton: {
    backgroundColor: '#6366F1',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  datePickerClose: {
    fontSize: 24,
    color: '#6B7280',
  },
  datePickerScroll: {
    padding: 16,
  },
  dateOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  dateOptionSelected: {
    backgroundColor: '#6366F1',
  },
  dateOptionToday: {
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  dateOptionText: {
    fontSize: 16,
    color: '#1F2937',
    textTransform: 'capitalize',
  },
  dateOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});