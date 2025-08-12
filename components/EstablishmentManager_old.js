// components/EstablishmentManager.js - VERSÃO COM USER_ID E PESQUISA
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import EstablishmentForm from './EstablishmentForm';
import EstablishmentList from './EstablishmentList';
import { useAuth } from '../services/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  NUBANK_COLORS,
  NUBANK_SPACING,
  NUBANK_FONT_SIZES,
  NUBANK_BORDER_RADIUS,
  NUBANK_FONT_WEIGHTS,
  NUBANK_SHADOWS
} from '../constants/nubank-theme';

export default function EstablishmentManager({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEstablishment, setSelectedEstablishment] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState('');

  const handleEdit = useCallback((establishment) => {
    setSelectedEstablishment(establishment);
    setModalVisible(true);
  }, []);

  const handleSaved = useCallback(() => {
    setModalVisible(false);
    setSelectedEstablishment(null);
    setRefreshKey(prev => prev + 1);
  }, []);

  const handleAddNew = useCallback(() => {
    setSelectedEstablishment(null);
    setModalVisible(true);
  }, []);

  const handleSearch = useCallback(() => {
    setActiveSearchQuery(searchQuery.trim());
  }, [searchQuery]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setActiveSearchQuery('');
  }, []);

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header com gradiente */}
      <LinearGradient
        colors={NUBANK_COLORS.GRADIENT_PRIMARY}
        style={[styles.header, { paddingTop: insets.top }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
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
            <Text style={styles.headerTitle}>Estabelecimentos</Text>
            <Text style={styles.headerSubtitle}>Gerenciar estabelecimentos</Text>
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddNew}
          >
            <MaterialCommunityIcons
              name="plus"
              size={24}
              color={NUBANK_COLORS.TEXT_WHITE}
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

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
            placeholder="Buscar estabelecimento..."
            placeholderTextColor={NUBANK_COLORS.TEXT_TERTIARY}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
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

      {/* Lista com user_id e pesquisa */}
      <EstablishmentList 
        key={refreshKey} 
        onEdit={handleEdit} 
        userId={user?.id} 
        searchQuery={activeSearchQuery}
      />

      {/* Novo Modal Form */}
      <EstablishmentForm
        visible={modalVisible}
        establishment={selectedEstablishment}
        onClose={() => setModalVisible(false)}
        onSaved={handleSaved}
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
  
  addButtonText: {
    color: NUBANK_COLORS.TEXT_WHITE,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD,
    fontSize: NUBANK_FONT_SIZES.SM
  },
  
  searchContainer: {
    paddingHorizontal: NUBANK_SPACING.LG,
    paddingTop: NUBANK_SPACING.MD,
    paddingBottom: NUBANK_SPACING.LG
  },
  
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NUBANK_COLORS.BACKGROUND_SECONDARY,
    borderRadius: NUBANK_BORDER_RADIUS.LG,
    paddingLeft: NUBANK_SPACING.MD,
    paddingRight: NUBANK_SPACING.SM,
    height: 44,
    borderWidth: 1,
    borderColor: NUBANK_COLORS.BACKGROUND_SECONDARY
  },
  
  searchInput: {
    flex: 1,
    fontSize: NUBANK_FONT_SIZES.MD,
    color: NUBANK_COLORS.TEXT_PRIMARY,
    height: 44,
    paddingRight: NUBANK_SPACING.SM
  },
  
  searchIconButton: {
    width: 32,
    height: 32,
    borderRadius: NUBANK_BORDER_RADIUS.MD,
    backgroundColor: NUBANK_COLORS.PRIMARY + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: NUBANK_SPACING.XS
  },
  
  clearButton: {
    marginLeft: NUBANK_SPACING.SM,
    padding: NUBANK_SPACING.XS
  }
});
