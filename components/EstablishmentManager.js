import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import EstablishmentForm from './EstablishmentForm';
import EstablishmentList from './EstablishmentList';

export default function EstablishmentManager() {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEstablishment, setSelectedEstablishment] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

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

  return (
    <View style={styles.container}>
      {/* Header simples */}
      <View style={styles.header}>
        <Text style={styles.icon}>🏪</Text>
        <Text style={styles.title}>Estabelecimentos</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddNew}>
          <Text style={styles.addButtonText}>+ Novo</Text>
        </TouchableOpacity>
      </View>

      {/* Lista simples */}
      <EstablishmentList key={refreshKey} onEdit={handleEdit} />

      {/* Modal simples */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelButton}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {selectedEstablishment ? 'Editar Estabelecimento' : 'Novo Estabelecimento'}
            </Text>
            <View style={styles.placeholder} />
          </View>
          
          <EstablishmentForm 
            establishment={selectedEstablishment} 
            onSaved={handleSaved}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  icon: {
    fontSize: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  cancelButton: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  placeholder: {
    width: 60,
  },
});