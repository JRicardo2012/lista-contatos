// components/PaymentMethodManager.js - VERSÃO CORRIGIDA
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
} from "react-native";
import { StyleSheet } from "react-native"; // Importação separada para debug
import { useSQLiteContext } from "expo-sqlite";

export default function PaymentMethodManager() {
  const db = useSQLiteContext();
  
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [newMethodName, setNewMethodName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState('💳');
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);

  // 🆕 ÍCONES DISPONÍVEIS PARA FORMAS DE PAGAMENTO
  const availableIcons = [
    '💳', '💵', '💰', '🏦', '📱', '💸', '🪙', '📲',
    '🏧', '💎', '🎫', '🎟️', '📄', '✅', '🔄', '⚡',
    '🛒', '🛍️', '💶', '💷', '💴', '🏪', '🏬', '🎁'
  ];

  useEffect(() => {
    if (db) {
      loadPaymentMethods();
    }
  }, [db]);

  const openNewMethodModal = () => {
    setEditingMethod(null);
    setNewMethodName("");
    setSelectedIcon('💳');
    setModalVisible(true);
  };

  const openEditMethodModal = (method) => {
    setEditingMethod(method);
    setNewMethodName(method.name);
    setSelectedIcon(method.icon || '💳');
    setModalVisible(true);
  };

  async function loadPaymentMethods() {
    try {
      console.log('🔍 Carregando métodos de pagamento...');
      
      const result = await db.getAllAsync("SELECT * FROM payment_methods ORDER BY name");
      
      // Remove duplicatas baseado no nome
      const uniqueMethods = result.filter((method, index, self) => 
        index === self.findIndex(m => m.name === method.name)
      );
      
      setPaymentMethods(uniqueMethods);
      console.log(`✅ ${uniqueMethods.length} métodos de pagamento carregados`);
      
    } catch (err) {
      console.error("❌ Erro ao carregar métodos de pagamento:", err);
      Alert.alert(
        "Erro", 
        "Não foi possível carregar os métodos de pagamento.",
        [{ text: "OK", onPress: () => setLoading(false) }]
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveMethod() {
    const name = newMethodName.trim();
    
    if (!name) {
      Alert.alert("Validação", "Digite um nome para o método de pagamento.");
      return;
    }

    if (name.length < 2) {
      Alert.alert("Validação", "Nome deve ter pelo menos 2 caracteres.");
      return;
    }

    if (name.length > 30) {
      Alert.alert("Validação", "Nome deve ter no máximo 30 caracteres.");
      return;
    }

    try {
      if (editingMethod) {
        // Editando método existente
        await db.runAsync(
          "UPDATE payment_methods SET name = ?, icon = ? WHERE id = ?", 
          [name, selectedIcon, editingMethod.id]
        );
        Alert.alert("Sucesso", `Método "${name}" atualizado!`);
      } else {
        // Criando novo método
        const exists = await db.getFirstAsync(
          "SELECT id FROM payment_methods WHERE LOWER(name) = LOWER(?)", 
          [name]
        );
        
        if (exists) {
          Alert.alert("Atenção", "Um método de pagamento com este nome já existe.");
          return;
        }

        await db.runAsync(
          "INSERT INTO payment_methods (name, icon) VALUES (?, ?)", 
          [name, selectedIcon]
        );
        Alert.alert("Sucesso", `Método "${name}" criado!`);
      }

      setModalVisible(false);
      await loadPaymentMethods();
      
    } catch (error) {
      console.error("❌ Erro ao salvar método:", error);
      Alert.alert("Erro", `Não foi possível salvar o método: ${error.message}`);
    }
  }

  async function handleDeleteMethod(method) {
    Alert.alert(
      "⚠️ Confirmar Exclusão", 
      `Deseja excluir o método "${method.name}"?\n\nEsta ação não pode ser desfeita.`, 
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await db.runAsync("DELETE FROM payment_methods WHERE id = ?", [method.id]);
              await loadPaymentMethods();
              Alert.alert("Sucesso", `Método "${method.name}" excluído!`);
            } catch (error) {
              console.error("❌ Erro ao excluir método:", error);
              Alert.alert("Erro", `Não foi possível excluir o método: ${error.message}`);
            }
          },
        },
      ]
    );
  }

  const renderIconSelector = () => (
    <View style={styles.iconSelectorContainer}>
      <Text style={styles.sectionTitle}>Escolha um ícone:</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.iconScroll}
      >
        {availableIcons.map((icon, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.iconOption,
              selectedIcon === icon && styles.iconOptionSelected
            ]}
            onPress={() => setSelectedIcon(icon)}
          >
            <Text style={styles.iconOptionText}>{icon}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Carregando métodos de pagamento...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.titleIcon}>💳</Text>
              <Text style={styles.title}>Formas de Pagamento</Text>
            </View>
            <Text style={styles.subtitle}>
              {paymentMethods.length === 0 
                ? "Configure suas formas de pagamento" 
                : `${paymentMethods.length} método${paymentMethods.length !== 1 ? 's' : ''} cadastrado${paymentMethods.length !== 1 ? 's' : ''}`
              }
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.addButton}
            onPress={openNewMethodModal}
          >
            <Text style={styles.addButtonIcon}>+</Text>
            <Text style={styles.addButtonText}>Novo</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Lista de Métodos */}
      {paymentMethods.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>💳</Text>
          <Text style={styles.emptyTitle}>Nenhum método ainda</Text>
          <Text style={styles.emptySubtitle}>
            Adicione formas de pagamento como Dinheiro, Cartão de Crédito, PIX, etc.
          </Text>
          <TouchableOpacity 
            style={styles.emptyButton}
            onPress={openNewMethodModal}
          >
            <Text style={styles.emptyButtonText}>➕ Criar Primeiro Método</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={paymentMethods}
          keyExtractor={(item) => `payment-method-${item.id}`}
          renderItem={({ item, index }) => (
            <View style={[styles.methodCard, { marginTop: index === 0 ? 0 : 6 }]}>
              <TouchableOpacity 
                style={styles.methodContent}
                onPress={() => openEditMethodModal(item)}
                activeOpacity={0.8}
              >
                <View style={styles.methodIconContainer}>
                  <Text style={styles.methodIconText}>{item.icon || '💳'}</Text>
                </View>
                
                <View style={styles.methodInfo}>
                  <Text style={styles.methodName}>{item.name}</Text>
                </View>
                
                <Text style={styles.editIcon}>✏️</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => handleDeleteMethod(item)}
                activeOpacity={0.8}
              >
                <Text style={styles.deleteButtonText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal do Formulário */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header do Modal */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingMethod ? '✏️ Editar Método' : '➕ Novo Método'}
              </Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Formulário */}
            <ScrollView style={styles.modalBody}>
              {/* Campo Nome */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Nome do Método *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ex: Dinheiro, Cartão de Crédito, PIX..."
                  value={newMethodName}
                  onChangeText={setNewMethodName}
                  maxLength={30}
                  autoFocus={true}
                />
                <Text style={styles.charCounter}>{newMethodName.length}/30</Text>
              </View>

              {/* Seletor de Ícones */}
              {renderIconSelector()}

              {/* Preview */}
              <View style={styles.previewContainer}>
                <Text style={styles.previewLabel}>Preview:</Text>
                <View style={styles.previewCard}>
                  <View style={styles.previewIcon}>
                    <Text style={styles.previewIconText}>{selectedIcon}</Text>
                  </View>
                  <Text style={styles.previewName}>
                    {newMethodName || 'Nome do método'}
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Footer com Botões */}
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.saveButton,
                  !newMethodName.trim() && styles.saveButtonDisabled
                ]}
                onPress={handleSaveMethod}
                disabled={!newMethodName.trim()}
              >
                <Text style={styles.saveButtonText}>
                  {editingMethod ? '💾 Salvar' : '➕ Criar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Definindo estilos como objeto JavaScript para evitar problemas
const styles = {
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 0,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  titleIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '400',
  },
  addButton: {
    backgroundColor: '#34d399',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: '#34d399',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  addButtonIcon: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
    marginRight: 6,
  },
  addButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  list: {
    padding: 16,
  },
  methodCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'stretch',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.08)',
    minHeight: 64,
  },
  methodContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  methodIconContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#f0f4ff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.12)',
  },
  methodIconText: {
    fontSize: 18,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  editIcon: {
    fontSize: 14,
    marginLeft: 8,
    opacity: 0.4,
    color: '#6366f1',
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    minWidth: 48,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(239, 68, 68, 0.12)',
  },
  deleteButtonText: {
    fontSize: 18,
    color: '#ef4444',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
    opacity: 0.3,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyButton: {
    backgroundColor: '#34d399',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#34d399',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7f9fc',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    width: '92%',
    maxHeight: '85%',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.2,
    shadowRadius: 48,
    elevation: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1e293b',
  },
  closeButton: {
    width: 40,
    height: 40,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: '500',
  },
  modalBody: {
    padding: 24,
    maxHeight: 450,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 10,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    backgroundColor: '#fafbfc',
    color: '#1e293b',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  charCounter: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'right',
    marginTop: 6,
  },
  iconSelectorContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 16,
  },
  iconScroll: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  iconOption: {
    width: 56,
    height: 56,
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  iconOptionSelected: {
    backgroundColor: '#f0fdf4',
    borderColor: '#34d399',
    shadowColor: '#34d399',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  iconOptionText: {
    fontSize: 22,
  },
  previewContainer: {
    marginBottom: 24,
  },
  previewLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 16,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  previewIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  previewIconText: {
    fontSize: 20,
  },
  previewName: {
    fontSize: 17,
    fontWeight: '500',
    color: '#1e293b',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748b',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#34d399',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#34d399',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: '#d1d5db',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
};