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

export default function ExpenseCategoryList({ selectedCategory, onCategorySelect }) {
  const db = useSQLiteContext();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (db) {
      loadCategories();
    }
  }, [db]);

  async function loadCategories() {
    try {
      console.log('🔍 Carregando categorias...');
      const result = await db.getAllAsync("SELECT id, name, icon FROM categories ORDER BY name");
      console.log('📋 Categorias encontradas:', result.length);
      
      // Remove duplicatas baseado no ID
      const uniqueCategories = result.filter((category, index, self) => 
        index === self.findIndex(c => c.id === category.id)
      );
      
      setCategories(uniqueCategories);
      console.log('✅ Categorias únicas:', uniqueCategories.length);
    } catch (err) {
      console.error("❌ Erro ao carregar categorias:", err);
    } finally {
      setLoading(false);
    }
  }

  const getSelectedCategoryData = () => {
    return categories.find(cat => cat.id === selectedCategory);
  };

  const handleSelectCategory = (categoryId) => {
    console.log('🎯 Categoria selecionada:', categoryId);
    onCategorySelect(categoryId);
    setModalVisible(false);
  };

  const handleClearSelection = () => {
    console.log('🧹 Limpando seleção de categoria');
    onCategorySelect(null);
  };

  const renderCategory = ({ item }) => {
    const isSelected = selectedCategory === item.id;
    
    return (
      <TouchableOpacity
        style={[styles.categoryItem, isSelected && styles.categorySelected]}
        onPress={() => handleSelectCategory(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.categoryContent}>
          <View style={[styles.iconContainer, isSelected && styles.iconContainerSelected]}>
            <Text style={styles.categoryIcon}>{item.icon || '📦'}</Text>
          </View>
          <View style={styles.categoryTextContainer}>
            <Text style={[styles.categoryName, isSelected && styles.categoryNameSelected]}>
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
        <Text style={styles.loadingText}>Carregando categorias...</Text>
      </View>
    );
  }

  if (categories.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📂</Text>
        <Text style={styles.emptyTitle}>Nenhuma categoria encontrada</Text>
        <Text style={styles.emptySubtitle}>Vá em "Categorias" para criar algumas</Text>
      </View>
    );
  }

  const selectedCategoryData = getSelectedCategoryData();

  return (
    <View style={styles.container}>
      {/* Selector Principal */}
      <TouchableOpacity
        style={[
          styles.selector,
          selectedCategory && styles.selectorSelected
        ]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <View style={styles.selectorContent}>
          <View style={[
            styles.selectorIconContainer,
            selectedCategory && styles.selectorIconContainerSelected
          ]}>
            <Text style={styles.selectorIcon}>
              {selectedCategoryData ? selectedCategoryData.icon : '📂'}
            </Text>
          </View>
          
          <View style={styles.selectorTextContainer}>
            <Text style={[
              styles.selectorText,
              selectedCategory ? styles.selectorTextSelected : styles.selectorTextPlaceholder
            ]}>
              {selectedCategoryData ? selectedCategoryData.name : 'Toque para selecionar categoria'}
            </Text>
          </View>

          {selectedCategory && (
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

      {/* Modal com Lista Melhorada */}
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
                <Text style={styles.modalIcon}>📂</Text>
                <Text style={styles.modalTitle}>Escolha uma categoria</Text>
              </View>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                style={styles.closeButtonContainer}
              >
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {/* Lista de Categorias */}
            <FlatList
              data={categories}
              keyExtractor={(item) => `category-${item.id}`}
              renderItem={renderCategory}
              style={styles.categoryList}
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
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
    shadowColor: '#10b981',
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
    backgroundColor: '#dcfce7',
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
    color: '#166534',
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

  // ========== LISTA DE CATEGORIAS ==========
  categoryList: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  categoryItem: {
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
  categorySelected: {
    backgroundColor: '#f0fdf4',
    borderWidth: 2,
    borderColor: '#10b981',
    shadowColor: '#10b981',
    shadowOpacity: 0.2,
  },
  categoryContent: {
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
    backgroundColor: '#dcfce7',
  },
  categoryIcon: {
    fontSize: 20,
  },
  categoryTextContainer: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  categoryNameSelected: {
    color: '#166534',
    fontWeight: '700',
  },
  checkContainer: {
    width: 28,
    height: 28,
    backgroundColor: '#10b981',
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