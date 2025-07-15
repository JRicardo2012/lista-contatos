import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Modal,
} from "react-native";
import { useDatabaseSafety } from "../hooks/useDatabaseSafety"; // 👈 NOVO HOOK

export default function CategoryManager() {
  // 🔒 USA HOOK DE SEGURANÇA EM VEZ DE useSQLiteContext
  const { isReady, error, safeQuery, safeRun, safeGetFirst } = useDatabaseSafety();
  
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState('📦');
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  // 🆕 ÍCONES DISPONÍVEIS PARA SELEÇÃO
  const availableIcons = [
    '🍽️', '🚗', '🏠', '🎮', '🏥', '📚', '🛒', '💼', 
    '✈️', '🎬', '💊', '⛽', '🔧', '👕', '💄', '🎵',
    '📱', '💻', '🏃', '🎾', '🍺', '☕', '🍕', '💡',
    '📦', '💰', '🎯', '🔥', '⭐', '❤️', '🎉', '📊'
  ];

  useEffect(() => {
    if (isReady) {
      loadCategories();
    }
  }, [isReady]);

  // 🔄 FUNÇÃO PARA ABRIR MODAL PARA NOVA CATEGORIA
  const openNewCategoryModal = () => {
    setEditingCategory(null);
    setNewCategoryName("");
    setSelectedIcon('📦');
    setModalVisible(true);
  };

  // 🔄 FUNÇÃO PARA ABRIR MODAL PARA EDITAR CATEGORIA
  const openEditCategoryModal = (category) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setSelectedIcon(category.icon || '📦');
    setModalVisible(true);
  };

  async function loadCategories() {
    if (!isReady) {
      console.warn('⚠️ Tentativa de carregar categorias com banco não pronto');
      return;
    }

    try {
      console.log('🔍 Carregando categorias com segurança...');
      
      const result = await safeQuery("SELECT * FROM categories ORDER BY name");
      
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
        "Não foi possível carregar as categorias. Verifique se o banco está inicializado.",
        [
          { text: "OK", onPress: () => setLoading(false) }
        ]
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveCategory() {
    if (!isReady) {
      Alert.alert("Erro", "Banco de dados não está pronto. Aguarde um momento.");
      return;
    }

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
        await safeRun(
          "UPDATE categories SET name = ?, icon = ? WHERE id = ?", 
          [name, selectedIcon, editingCategory.id]
        );
        Alert.alert("Sucesso", `Categoria "${name}" atualizada!`);
      } else {
        // Criando nova categoria
        // Verifica se já existe
        const exists = await safeGetFirst(
          "SELECT id FROM categories WHERE LOWER(name) = LOWER(?)", 
          [name]
        );
        
        if (exists) {
          Alert.alert("Atenção", "Uma categoria com este nome já existe.");
          return;
        }

        await safeRun(
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
    if (!isReady) {
      Alert.alert("Erro", "Banco de dados não está pronto.");
      return;
    }

    Alert.alert(
      "⚠️ Confirmar Exclusão", 
      `Deseja excluir a categoria "${category.name}"?\n\nEsta ação não pode ser desfeita.`, 
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await safeRun("DELETE FROM categories WHERE id = ?", [category.id]);
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

  // 🎨 RENDERIZA SELETOR DE ÍCONES
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

  // 🔴 ESTADO DE ERRO DO BANCO
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Erro no Banco de Dados</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => window.location.reload()}
        >
          <Text style={styles.retryButtonText}>🔄 Reiniciar App</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 🔄 BANCO AINDA NÃO ESTÁ PRONTO
  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Aguardando banco de dados...</Text>
        <Text style={styles.loadingSubtext}>
          O banco está sendo inicializado. Aguarde um momento.
        </Text>
      </View>
    );
  }

  // ✅ BANCO PRONTO - RENDERIZA NORMALMENTE
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
            <Text style={styles.title}>📂 Categorias</Text>
            <Text style={styles.subtitle}>
              {categories.length === 0 
                ? "Organize suas despesas" 
                : `${categories.length} categoria${categories.length !== 1 ? 's' : ''} criada${categories.length !== 1 ? 's' : ''}`
              }
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.addButton}
            onPress={openNewCategoryModal} // 🔥 CORRIGIDO AQUI!
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
            Crie categorias para organizar suas despesas de forma inteligente!
          </Text>
          <TouchableOpacity 
            style={styles.emptyButton}
            onPress={openNewCategoryModal} // 🔥 CORRIGIDO AQUI!
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
                onPress={() => openEditCategoryModal(item)} // 🔥 CORRIGIDO AQUI!
                activeOpacity={0.8}
              >
                <View style={styles.categoryIconContainer}>
                  <Text style={styles.categoryIconText}>{item.icon || '📦'}</Text>
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

      {/* 🆕 MODAL DO FORMULÁRIO - ESSA PARTE ESTAVA FALTANDO! */}
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
                  placeholder="Ex: Alimentação, Transporte..."
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
  // ... styles existentes ...
  
  // 🆕 NOVOS STYLES PARA ESTADOS DE ERRO
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 40,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
  },
  
  // ... resto dos styles permanecem iguais
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  addButton: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  addButtonIcon: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: 'bold',
    marginRight: 6,
  },
  addButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  list: {
    padding: 16,
  },
  categoryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'stretch',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  categoryContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  categoryIconContainer: {
    width: 50,
    height: 50,
    backgroundColor: '#f3f4f6',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  categoryIconText: {
    fontSize: 24,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 2,
  },
  editIcon: {
    fontSize: 16,
    marginLeft: 8,
    opacity: 0.5,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    minWidth: 60,
  },
  deleteButtonText: {
    fontSize: 20,
    color: '#ffffff',
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
    opacity: 0.6,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
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
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },

  // 🆕 STYLES DO MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  closeButton: {
    width: 36,
    height: 36,
    backgroundColor: '#f3f4f6',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6b7280',
    fontWeight: '600',
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  charCounter: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
    marginTop: 4,
  },
  iconSelectorContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  iconScroll: {
    flexDirection: 'row',
  },
  iconOption: {
    width: 50,
    height: 50,
    backgroundColor: '#f8fafc',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconOptionSelected: {
    backgroundColor: '#dcfce7',
    borderColor: '#10b981',
  },
  iconOptionText: {
    fontSize: 20,
  },
  previewContainer: {
    marginBottom: 20,
  },
  previewLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  previewIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  previewIconText: {
    fontSize: 18,
  },
  previewName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
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
  saveButton: {
    flex: 1,
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});