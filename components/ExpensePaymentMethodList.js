import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import { useFocusEffect } from "@react-navigation/native";

export default function ExpensePaymentMethodList({ selectedMethod, onMethodSelect }) {
  const db = useSQLiteContext();
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  // 🚀 RECARREGA SEMPRE QUE A TELA FICAR ATIVA
  useFocusEffect(
    React.useCallback(() => {
      if (db) {
        console.log('🔄 Tela ficou ativa - recarregando métodos de pagamento...');
        loadPaymentMethods();
      }
    }, [db])
  );

  // 🔄 RECARREGA TAMBÉM QUANDO O MODAL ABRE
  useEffect(() => {
    if (modalVisible && db) {
      console.log('📝 Modal aberto - recarregando métodos de pagamento...');
      loadPaymentMethods();
    }
  }, [modalVisible, db]);

  async function loadPaymentMethods() {
    try {
      console.log('💳 Carregando métodos de pagamento...');
      const result = await db.getAllAsync(`
        SELECT id, name, icon 
        FROM payment_methods 
        ORDER BY name ASC
      `);
      console.log('💳 Métodos encontrados:', result.length);
      
      // Remove duplicatas baseado no ID
      const uniqueMethods = result.filter((method, index, self) => 
        index === self.findIndex(m => m.id === method.id)
      );
      
      setPaymentMethods(uniqueMethods);
      console.log('✅ Métodos únicos:', uniqueMethods.length);
    } catch (err) {
      console.error("❌ Erro ao carregar métodos de pagamento:", err);
    } finally {
      setLoading(false);
    }
  }

  const getSelectedMethodData = () => {
    return paymentMethods.find(method => method.id === selectedMethod);
  };

  const handleSelectMethod = (methodId) => {
    console.log('💳 Método de pagamento selecionado:', methodId);
    onMethodSelect(methodId);
    setModalVisible(false);
  };

  const handleClearSelection = () => {
    console.log('🧹 Limpando seleção de método de pagamento');
    onMethodSelect(null);
  };

  // 🔄 FUNÇÃO MANUAL DE REFRESH
  const handleManualRefresh = () => {
    console.log('🔄 Refresh manual solicitado...');
    setLoading(true);
    loadPaymentMethods();
  };

  const renderMethod = ({ item }) => {
    const isSelected = selectedMethod === item.id;
    
    return (
      <TouchableOpacity
        style={[styles.methodItem, isSelected && styles.methodSelected]}
        onPress={() => handleSelectMethod(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.methodContent}>
          <View style={[styles.iconContainer, isSelected && styles.iconContainerSelected]}>
            <Text style={styles.methodIcon}>{item.icon || '💳'}</Text>
          </View>
          <View style={styles.methodTextContainer}>
            <Text style={[styles.methodName, isSelected && styles.methodNameSelected]}>
              {item.name}
            </Text>
          </View>
        </View>
        {isSelected && (
          <View style={styles.checkContainer}>
            <Text style={styles.checkmark}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#10b981" />
        <Text style={styles.loadingText}>Carregando formas de pagamento...</Text>
      </View>
    );
  }

  if (paymentMethods.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>💳</Text>
        <Text style={styles.emptyTitle}>Nenhuma forma de pagamento</Text>
        <Text style={styles.emptySubtitle}>Vá em "Formas de Pagamento" para criar algumas</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={handleManualRefresh}>
          <Text style={styles.refreshButtonText}>🔄 Atualizar Lista</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const selectedMethodData = getSelectedMethodData();

  return (
    <View style={styles.container}>
      {/* Selector Principal */}
      <TouchableOpacity
        style={[
          styles.selector,
          selectedMethod && styles.selectorSelected
        ]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <View style={styles.selectorContent}>
          <View style={[
            styles.selectorIconContainer,
            selectedMethod && styles.selectorIconContainerSelected
          ]}>
            <Text style={styles.selectorIcon}>
              {selectedMethodData ? selectedMethodData.icon : '💳'}
            </Text>
          </View>
          
          <View style={styles.selectorTextContainer}>
            <Text style={[
              styles.selectorText,
              selectedMethod ? styles.selectorTextSelected : styles.selectorTextPlaceholder
            ]}>
              {selectedMethodData ? selectedMethodData.name : 'Forma de pagamento (opcional)'}
            </Text>
          </View>

          {selectedMethod && (
            <TouchableOpacity 
              style={styles.clearButton} 
              onPress={handleClearSelection}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
          
          <View style={styles.arrowContainer}>
            <Text style={styles.arrow}>▼</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Modal com Lista */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header do Modal com Botão de Refresh */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalIcon}>💳</Text>
                <Text style={styles.modalTitle}>Escolha a forma de pagamento</Text>
              </View>
              <View style={styles.headerButtons}>
                <TouchableOpacity 
                  style={styles.refreshIconButton}
                  onPress={handleManualRefresh}
                >
                  <Text style={styles.refreshIcon}>🔄</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setModalVisible(false)}
                  style={styles.closeButtonContainer}
                >
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Indicador de Loading no Modal */}
            {loading && (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="small" color="#10b981" />
                <Text style={styles.modalLoadingText}>Atualizando...</Text>
              </View>
            )}
            
            {/* Lista de Métodos */}
            <FlatList
              data={paymentMethods}
              keyExtractor={(item) => `payment-method-${item.id}`}
              renderItem={renderMethod}
              style={styles.methodList}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />

            {/* Footer do Modal */}
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // Container limpo
  },

  // ========== SELECTOR PRINCIPAL ==========
  selector: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  selectorSelected: {
    borderColor: '#8b5cf6',
    backgroundColor: '#f5f3ff',
    shadowColor: '#8b5cf6',
    shadowOpacity: 0.2,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
  },
  selectorIconContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectorIconContainerSelected: {
    backgroundColor: '#ede9fe',
  },
  selectorIcon: {
    fontSize: 20,
  },
  selectorTextContainer: {
    flex: 1,
  },
  selectorText: {
    fontSize: 16,
    fontWeight: '500',
  },
  selectorTextSelected: {
    color: '#6d28d9',
    fontWeight: '600',
  },
  selectorTextPlaceholder: {
    color: '#9ca3af',
  },
  clearButton: {
    width: 28,
    height: 28,
    backgroundColor: '#fee2e2',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  clearIcon: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: 'bold',
  },
  arrowContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrow: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },

  // ========== MODAL ==========
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshIconButton: {
    width: 32,
    height: 32,
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshIcon: {
    fontSize: 16,
  },
  closeButtonContainer: {
    width: 32,
    height: 32,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: 'bold',
  },

  // Loading no Modal
  modalLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#f0fdf4',
    borderBottomWidth: 1,
    borderBottomColor: '#dcfce7',
  },
  modalLoadingText: {
    marginLeft: 8,
    color: '#166534',
    fontSize: 14,
    fontWeight: '600',
  },

  // ========== LISTA DE MÉTODOS ==========
  methodList: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  methodItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  methodSelected: {
    backgroundColor: '#f5f3ff',
    borderWidth: 2,
    borderColor: '#8b5cf6',
    shadowColor: '#8b5cf6',
    shadowOpacity: 0.2,
  },
  methodContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    backgroundColor: '#f8fafc',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconContainerSelected: {
    backgroundColor: '#ede9fe',
  },
  methodIcon: {
    fontSize: 20,
  },
  methodTextContainer: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  methodNameSelected: {
    color: '#6d28d9',
    fontWeight: '700',
  },
  checkContainer: {
    width: 28,
    height: 28,
    backgroundColor: '#8b5cf6',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginHorizontal: 16,
  },

  // ========== FOOTER DO MODAL ==========
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },

  // ========== ESTADOS ESPECIAIS ==========
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  loadingText: {
    marginLeft: 12,
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
    opacity: 0.6,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  refreshButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});