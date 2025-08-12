// components/PaymentMethodManager.js - VERSÃO PADRONIZADA COM MODALFORM
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

export default function PaymentMethodManager() {
  const [formVisible, setFormVisible] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleAdd = useCallback((initialName = '') => {
    setEditingMethod(null);
    setFormVisible(true);
  }, []);

  const handleEdit = useCallback((method) => {
    setEditingMethod(method);
    setFormVisible(true);
  }, []);

  const handleFormClose = useCallback(() => {
    setFormVisible(false);
    setEditingMethod(null);
  }, []);

  const handleFormSaved = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    handleFormClose();
  }, [handleFormClose]);

  return (
    <View style={styles.container}>
      {/* Header padrão Nubank */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <MaterialCommunityIcons
              name="credit-card"
              size={24}
              color={NUBANK_COLORS.PRIMARY}
              style={styles.titleIcon}
            />
            <Text style={styles.title}>Formas de Pagamento</Text>
          </View>

          <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
            <MaterialCommunityIcons
              name="plus"
              size={20}
              color={NUBANK_COLORS.TEXT_WHITE}
              style={styles.addButtonIcon}
            />
            <Text style={styles.addButtonText}>Nova</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Lista de formas de pagamento */}
      <PaymentMethodList
        onEdit={handleEdit}
        onAdd={handleAdd}
        refreshTrigger={refreshTrigger}
      />

      {/* Modal do formulário */}
      <PaymentMethodFormWithPreview
        visible={formVisible}
        paymentMethod={editingMethod}
        onClose={handleFormClose}
        onSaved={handleFormSaved}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NUBANK_COLORS.BACKGROUND_SECONDARY
  },
  
  header: {
    backgroundColor: NUBANK_COLORS.BACKGROUND,
    paddingHorizontal: NUBANK_SPACING.LG,
    paddingTop: NUBANK_SPACING.LG,
    paddingBottom: NUBANK_SPACING.LG,
    borderBottomWidth: 1,
    borderBottomColor: NUBANK_COLORS.CARD_BORDER
  },
  
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  
  titleIcon: {
    marginRight: NUBANK_SPACING.SM
  },
  
  title: {
    fontSize: NUBANK_FONT_SIZES.XL,
    fontWeight: NUBANK_FONT_WEIGHTS.BOLD,
    color: NUBANK_COLORS.TEXT_PRIMARY
  },
  
  addButton: {
    backgroundColor: NUBANK_COLORS.PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: NUBANK_SPACING.MD,
    paddingVertical: NUBANK_SPACING.SM,
    borderRadius: NUBANK_BORDER_RADIUS.MD,
    ...NUBANK_SHADOWS.SM
  },
  
  addButtonIcon: {
    marginRight: NUBANK_SPACING.XS
  },
  
  addButtonText: {
    color: NUBANK_COLORS.TEXT_WHITE,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD,
    fontSize: NUBANK_FONT_SIZES.SM
  }
});
