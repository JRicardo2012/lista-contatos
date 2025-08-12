// components/PaymentMethodManager.js - VERSÃO PADRONIZADA COM MODALFORM
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  NUBANK_COLORS,
  NUBANK_SPACING,
  NUBANK_FONT_SIZES,
  NUBANK_BORDER_RADIUS,
  NUBANK_SHADOWS,
  NUBANK_FONT_WEIGHTS
} from '../constants/nubank-theme';
import PaymentMethodFormWithPreview from './PaymentMethodFormWithPreview';
import PaymentMethodList from './PaymentMethodList';

export default function PaymentMethodManager({ navigation }) {
  const insets = useSafeAreaInsets();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [formVisible, setFormVisible] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleNewMethod = useCallback(() => {
    setEditingMethod(null);
    setFormVisible(true);
  }, []);

  const handleEditMethod = useCallback((method) => {
    setEditingMethod(method);
    setFormVisible(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setFormVisible(false);
    setEditingMethod(null);
  }, []);

  const handleSaveMethod = useCallback(() => {
    setFormVisible(false);
    setEditingMethod(null);
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const clearSearch = () => {
    setSearchQuery('');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={NUBANK_COLORS.TEXT_WHITE}
            />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Formas de Pagamento</Text>
            <Text style={styles.headerSubtitle}>Gerenciar formas de pagamento</Text>
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={handleNewMethod}
          >
            <MaterialCommunityIcons
              name="plus"
              size={24}
              color={NUBANK_COLORS.TEXT_WHITE}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Barra de pesquisa */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color={NUBANK_COLORS.TEXT_SECONDARY}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar forma de pagamento..."
            placeholderTextColor={NUBANK_COLORS.TEXT_TERTIARY}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <MaterialCommunityIcons
                name="close-circle"
                size={20}
                color={NUBANK_COLORS.TEXT_SECONDARY}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Lista de formas de pagamento */}
      <PaymentMethodList
        searchQuery={searchQuery}
        onEdit={handleEditMethod}
        onAdd={handleNewMethod}
        refreshTrigger={refreshTrigger}
      />

      {/* Modal do formulário */}
      <PaymentMethodFormWithPreview
        visible={formVisible}
        paymentMethod={editingMethod}
        onClose={handleCloseForm}
        onSaved={handleSaveMethod}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NUBANK_COLORS.BACKGROUND
  },
  
  header: {
    backgroundColor: NUBANK_COLORS.PRIMARY,
    paddingHorizontal: NUBANK_SPACING.LG,
    paddingBottom: NUBANK_SPACING.LG
  },
  
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: NUBANK_SPACING.MD
  },
  
  backButton: {
    width: 40,
    height: 40,
    borderRadius: NUBANK_BORDER_RADIUS.ROUND,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: NUBANK_SPACING.MD
  },
  
  headerTitleContainer: {
    flex: 1
  },
  
  headerTitle: {
    fontSize: NUBANK_FONT_SIZES.LG,
    fontWeight: NUBANK_FONT_WEIGHTS.BOLD,
    color: NUBANK_COLORS.TEXT_WHITE,
    marginBottom: NUBANK_SPACING.XS
  },
  
  headerSubtitle: {
    fontSize: NUBANK_FONT_SIZES.SM,
    color: NUBANK_COLORS.TEXT_WHITE,
    opacity: 0.9
  },
  
  addButton: {
    width: 40,
    height: 40,
    borderRadius: NUBANK_BORDER_RADIUS.ROUND,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: NUBANK_SPACING.MD
  },
  
  searchContainer: {
    paddingHorizontal: NUBANK_SPACING.LG,
    paddingVertical: NUBANK_SPACING.MD,
    backgroundColor: NUBANK_COLORS.BACKGROUND_SECONDARY
  },
  
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NUBANK_COLORS.BACKGROUND,
    borderRadius: NUBANK_BORDER_RADIUS.LG,
    paddingHorizontal: NUBANK_SPACING.MD,
    ...NUBANK_SHADOWS.SM
  },
  
  searchIcon: {
    marginRight: NUBANK_SPACING.SM
  },
  
  searchInput: {
    flex: 1,
    paddingVertical: NUBANK_SPACING.MD,
    fontSize: NUBANK_FONT_SIZES.MD,
    color: NUBANK_COLORS.TEXT_PRIMARY
  },
  
  clearButton: {
    marginLeft: NUBANK_SPACING.SM
  }
});
