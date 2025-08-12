// components/EstablishmentManager.js - VERSÃO COM USER_ID E PESQUISA
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import EstablishmentForm from './EstablishmentForm';
import EstablishmentList from './EstablishmentList';
import { useAuth } from '../services/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  NUBANK_COLORS,
  NUBANK_SPACING,
  NUBANK_FONT_SIZES,
  NUBANK_BORDER_RADIUS,
  NUBANK_FONT_WEIGHTS,
  NUBANK_SHADOWS
} from '../constants/nubank-theme';

export default function EstablishmentManager() {
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEstablishment, setSelectedEstablishment] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState('');

  function handleEdit(establishment) {
    setSelectedEstablishment(establishment);
    setModalVisible(true);
  }

  function handleSaved() {
    setModalVisible(false);
    setSelectedEstablishment(null);
    setRefreshKey(prev => prev + 1);
  }

  function handleAddNew() {
    setSelectedEstablishment(null);
    setModalVisible(true);
  }

  function handleSearch() {
    setActiveSearchQuery(searchQuery.trim());
  }

  function clearSearch() {
    setSearchQuery('');
    setActiveSearchQuery('');
  }

  return (
    <View style={styles.container}>
      {/* Header Nubank */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <MaterialCommunityIcons
              name='store'
              size={24}
              color={NUBANK_COLORS.PRIMARY}
              style={styles.titleIcon}
            />
            <Text style={styles.title}>Estabelecimentos</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={handleAddNew}>
            <MaterialCommunityIcons
              name='plus'
              size={20}
              color={NUBANK_COLORS.TEXT_WHITE}
              style={styles.addButtonIcon}
            />
            <Text style={styles.addButtonText}>Novo</Text>
          </TouchableOpacity>
        </View>
        
        {/* Campo de pesquisa fixo */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Pesquisar estabelecimentos..."
              placeholderTextColor={NUBANK_COLORS.TEXT_TERTIARY}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            <TouchableOpacity style={styles.searchIconButton} onPress={handleSearch}>
              <MaterialCommunityIcons
                name="magnify"
                size={20}
                color={NUBANK_COLORS.PRIMARY}
              />
            </TouchableOpacity>
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                <MaterialCommunityIcons
                  name="close-circle"
                  size={16}
                  color={NUBANK_COLORS.TEXT_SECONDARY}
                />
              </TouchableOpacity>
            )}
          </View>
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
