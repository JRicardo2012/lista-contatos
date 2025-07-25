// components/CategoryManager.js - VERSÃO CORRETA
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
import { StyleSheet } from "react-native";
import { useSQLiteContext } from "expo-sqlite";

export default function CategoryManager() {
  const db = useSQLiteContext();
  
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState('📂');
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  // 🎨 ÍCONES DISPONÍVEIS PARA CATEGORIAS
  const availableIcons = [
    '🍽️', '🛒', '🏠', '🚗', '⛽', '🎮', '🎬', '📚',
    '🏥', '💊', '👕', '👟', '✈️', '🏖️', '🎁', '💰',
    '📱', '💻', '🏋️', '🚌', '🚇', '🏪', '☕', '🍺',
    '🎯', '🔧', '🐾', '👶', '🎓', '💼', '🏦', '📦'
  ];

  useEffect(() => {
    if (db) {
      loadCategories();
    }
  }, [db]);

  const openNewCategoryModal = () => {
    setEditingCategory(null);
    setNewCategoryName("");
    setSelectedIcon('📂');
    setModalVisible(true);
  };

  const openEditCategoryModal = (category) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setSelectedIcon(category.icon || '📂');
    setModalVisible(true);
  };

  async function loadCategories() {
    try {
      console.log('🔍 Carregando categorias...');
      
      const result = await db.getAllAsync("SELECT * FROM categories ORDER BY name");
      
      // Remove duplicatas baseado no nome
      const uniqueCategories = result.filter((category, index, self) => 
        index === self.findIndex(c => c.name === category.name)
      );
      
      setCategories(uniqueCategories);
      console.log(`✅ ${uniqueCategories.length} categorias carregadas`);
      
    } catch (err) {
      console.error("❌ Erro ao carregar categorias:", err);
      Alert.alert(
        "Erro", 
        "Não foi possível carregar as categorias.",
        [{ text: "OK", onPress: () => setLoading(false) }]
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveCategory() {
    const name = newCategoryName.trim();
    
    if (!name) {
      Alert.alert("Validação", "Digite um nome para a categoria.");
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
      if (editingCategory) {
        // Editando categoria existente
        await db.runAsync(
          "UPDATE categories SET name = ?, icon = ? WHERE id = ?", 
          [name, selectedIcon, editingCategory.id]
        );
        Alert.alert("Sucesso", `Categoria "${name}" atualizada!`);
      } else {
        // Criando nova categoria
        const exists = await db.getFirstAsync(
          "SELECT id FROM categories WHERE LOWER(name) = LOWER(?)", 
          [name]
        );
        
        if (exists) {
          Alert.alert("Atenção", "Uma categoria com este nome já existe.");
          return;
        }

        await db.runAsync(
          "INSERT INTO categories (name, icon) VALUES (?, ?)", 
          [name, selectedIcon]
        );
        Alert.alert("Sucesso", `Categoria "${name}" criada!`);
      }

      setModalVisible(false);
      await loadCategories();
      
    } catch (error) {
      console.error("❌ Erro ao salvar categoria:", error);
      Alert.alert("Erro", `Não foi possível salvar a categoria: ${error.message}`);
    }
  }

  async function handleDeleteCategory(category) {
    // Verifica se há despesas usando esta categoria
    const expenses = await db.getFirstAsync(
      "SELECT COUNT(*) as count FROM expenses WHERE categoryId = ?",
      [category.id]
    );

    let warningMessage = `Deseja excluir a categoria "${category.name}"?`;
    
    if (expenses && expenses.count > 0) {
      warningMessage += `\n\n⚠️ Atenção: ${expenses.count} despesa(s) estão usando esta categoria e ficarão sem categoria.`;
    }

    Alert.alert(
      "⚠️ Confirmar Exclusão", 
      warningMessage + "\n\nEsta ação não pode ser desfeita.", 
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await db.runAsync("DELETE FROM categories WHERE id = ?", [category.id]);
              await loadCategories();
              Alert.alert("Sucesso", `Categoria "${category.name}" excluída!`);
            } catch (error) {
              console.error("❌ Erro ao excluir categoria:", error);
              Alert.alert("Erro", `Não foi possível excluir a categoria: ${error.message}`);
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
        <Text style={styles.loadingText}>Carregando categorias...</Text>
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
              <Text style={styles.titleIcon}>📂</Text>
              <Text style={styles.title}>Categorias</Text>
            </View>
            <Text style={styles.subtitle}>
              {categories.length === 0 
                ? "Organize suas despesas por categoria" 
                : `${categories.length} categoria${categories.length !== 1 ? 's' : ''} cadastrada${categories.length !== 1 ? 's' : ''}`
              }
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.addButton}
            onPress={openNewCategoryModal}
          >
            <Text style={styles.addButtonIcon}>+</Text>
            <Text style={styles.addButtonText}>Nova</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Lista de Categorias */}
      {categories.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📂</Text>
          <Text style={styles.emptyTitle}>Nenhuma categoria ainda</Text>
          <Text style={styles.emptySubtitle}>
            Crie categorias para organizar melhor suas despesas!
          </Text>
          <TouchableOpacity 
            style={styles.emptyButton}
            onPress={openNewCategoryModal}
          >
            <Text style={styles.emptyButtonText}>➕ Criar Primeira Categoria</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => `category-${item.id}`}
          renderItem={({ item, index }) => (
            <View style={[styles.categoryCard, { marginTop: index === 0 ? 0 : 6 }]}>
              <TouchableOpacity 
                style={styles.categoryContent}
                onPress={() => openEditCategoryModal(item)}
                activeOpacity={0.8}
              >
                <View style={styles.categoryIconContainer}>
                  <Text style={styles.categoryIconText}>{item.icon || '📂'}</Text>
                </View>
                
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>{item.name}</Text>
                </View>
                
                <Text style={styles.editIcon}>✏️</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => handleDeleteCategory(item)}
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
                {editingCategory ? '✏️ Editar Categoria' : '➕ Nova Categoria'}
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
                <Text style={styles.fieldLabel}>Nome da Categoria *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ex: Alimentação, Transporte, Lazer..."
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  maxLength={30}
                  autoFocus={true}
                />
                <Text style={styles.charCounter}>{newCategoryName.length}/30</Text>
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
                    {newCategoryName || 'Nome da categoria'}
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
                  !newCategoryName.trim() && styles.saveButtonDisabled
                ]}
                onPress={handleSaveCategory}
                disabled={!newCategoryName.trim()}
              >
                <Text style={styles.saveButtonText}>
                  {editingCategory ? '💾 Salvar' : '➕ Criar'}
                </Text>
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
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: '#10b981',
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
  categoryCard: {
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
  categoryContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  categoryIconContainer: {
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
  categoryIconText: {
    fontSize: 18,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
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
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#10b981',
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
    borderColor: '#10b981',
    shadowColor: '#10b981',
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
    backgroundColor: '#10b981',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#10b981',
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
});