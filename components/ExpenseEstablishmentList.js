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

export default function ExpenseEstablishmentList({ selectedEstablishment, onEstablishmentSelect }) {
  const db = useSQLiteContext();
  const [establishments, setEstablishments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (db) {
      loadEstablishments();
    }
  }, [db]);

  async function loadEstablishments() {
    try {
      console.log('🏪 Carregando estabelecimentos...');
      const result = await db.getAllAsync(`
        SELECT id, name, category, street, number, district, city 
        FROM establishments 
        ORDER BY name ASC
      `);
      console.log('🏪 Estabelecimentos encontrados:', result.length);
      
      setEstablishments(result);
      console.log('✅ Estabelecimentos carregados:', result.length);
    } catch (err) {
      console.error("❌ Erro ao carregar estabelecimentos:", err);
    } finally {
      setLoading(false);
    }
  }

  const getSelectedEstablishmentData = () => {
    return establishments.find(est => est.id === selectedEstablishment);
  };

  const handleSelectEstablishment = (establishmentId) => {
    console.log('🏪 Estabelecimento selecionado:', establishmentId);
    onEstablishmentSelect(establishmentId);
    setModalVisible(false);
  };

  const handleClearSelection = () => {
    console.log('🧹 Limpando seleção de estabelecimento');
    onEstablishmentSelect(null);
  };

  const formatAddress = (establishment) => {
    const parts = [];
    if (establishment.street) {
      if (establishment.number) {
        parts.push(`${establishment.street}, ${establishment.number}`);
      } else {
        parts.push(establishment.street);
      }
    }
    if (establishment.district) parts.push(establishment.district);
    if (establishment.city) parts.push(establishment.city);
    
    return parts.join(' - ') || 'Endereço não informado';
  };

  const renderEstablishment = ({ item }) => {
    const isSelected = selectedEstablishment === item.id;
    
    return (
      <TouchableOpacity
        style={[styles.establishmentItem, isSelected && styles.establishmentSelected]}
        onPress={() => handleSelectEstablishment(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.establishmentContent}>
          <View style={[styles.iconContainer, isSelected && styles.iconContainerSelected]}>
            <Text style={styles.establishmentIcon}>🏪</Text>
          </View>
          <View style={styles.establishmentTextContainer}>
            <Text style={[styles.establishmentName, isSelected && styles.establishmentNameSelected]}>
              {item.name}
            </Text>
            {item.category && (
              <Text style={styles.establishmentCategory}>
                📂 {item.category}
              </Text>
            )}
            <Text style={styles.establishmentAddress} numberOfLines={2}>
              📍 {formatAddress(item)}
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
        <Text style={styles.loadingText}>Carregando estabelecimentos...</Text>
      </View>
    );
  }

  if (establishments.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🏪</Text>
        <Text style={styles.emptyTitle}>Nenhum estabelecimento encontrado</Text>
        <Text style={styles.emptySubtitle}>Vá em "Estabelecimentos" para criar alguns</Text>
      </View>
    );
  }

  const selectedEstablishmentData = getSelectedEstablishmentData();

  return (
    <View style={styles.container}>
      {/* Selector Principal */}
      <TouchableOpacity
        style={[
          styles.selector,
          selectedEstablishment && styles.selectorSelected
        ]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <View style={styles.selectorContent}>
          <View style={[
            styles.selectorIconContainer,
            selectedEstablishment && styles.selectorIconContainerSelected
          ]}>
            <Text style={styles.selectorIcon}>🏪</Text>
          </View>
          
          <View style={styles.selectorTextContainer}>
            {selectedEstablishmentData ? (
              <View>
                <Text style={styles.selectorTextSelected}>
                  {selectedEstablishmentData.name}
                </Text>
                <Text style={styles.selectorSubtext} numberOfLines={1}>
                  {formatAddress(selectedEstablishmentData)}
                </Text>
              </View>
            ) : (
              <Text style={styles.selectorTextPlaceholder}>
                Estabelecimento (opcional)
              </Text>
            )}
          </View>

          {selectedEstablishment && (
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

      {/* Modal com Lista de Estabelecimentos */}
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
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalIcon}>🏪</Text>
                <Text style={styles.modalTitle}>Escolha um estabelecimento</Text>
              </View>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                style={styles.closeButtonContainer}
              >
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {/* Lista de Estabelecimentos */}
            <FlatList
              data={establishments}
              keyExtractor={(item) => `establishment-${item.id}`}
              renderItem={renderEstablishment}
              style={styles.establishmentList}
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
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  selectorSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
    shadowColor: '#3b82f6',
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
    backgroundColor: '#dbeafe',
  },
  selectorIcon: {
    fontSize: 20,
  },
  selectorTextContainer: {
    flex: 1,
  },
  selectorTextSelected: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 2,
  },
  selectorSubtext: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  selectorTextPlaceholder: {
    fontSize: 16,
    fontWeight: '500',
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

  // ========== LISTA DE ESTABELECIMENTOS ==========
  establishmentList: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  establishmentItem: {
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
  establishmentSelected: {
    backgroundColor: '#eff6ff',
    borderWidth: 2,
    borderColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.2,
  },
  establishmentContent: {
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
    backgroundColor: '#dbeafe',
  },
  establishmentIcon: {
    fontSize: 20,
  },
  establishmentTextContainer: {
    flex: 1,
  },
  establishmentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  establishmentNameSelected: {
    color: '#1e40af',
    fontWeight: '700',
  },
  establishmentCategory: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 2,
  },
  establishmentAddress: {
    fontSize: 12,
    color: '#9ca3af',
    lineHeight: 16,
  },
  checkContainer: {
    width: 28,
    height: 28,
    backgroundColor: '#3b82f6',
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
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
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
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
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
  },
});