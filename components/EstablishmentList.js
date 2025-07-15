import React, { useEffect, useState } from "react";
import {
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  Alert
} from "react-native";
import { useSQLiteContext } from "expo-sqlite";

export default function EstablishmentList({ onEdit }) {
  const db = useSQLiteContext();
  const [establishments, setEstablishments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (db) {
      loadEstablishments();
    }
  }, [db]);

  async function loadEstablishments() {
    try {
      const results = await db.getAllAsync(`
        SELECT * FROM establishments 
        ORDER BY name ASC
      `);
      setEstablishments(results);
    } catch (e) {
      console.error("Erro ao carregar estabelecimentos:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id, name) {
    Alert.alert(
      "Confirmar Exclusão",
      `Deseja excluir "${name}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await db.runAsync("DELETE FROM establishments WHERE id = ?", [id]);
              await loadEstablishments();
            } catch (error) {
              console.error("Erro ao excluir:", error);
            }
          },
        },
      ]
    );
  }

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <TouchableOpacity 
        style={styles.cardContent}
        onPress={() => onEdit(item)}
      >
        <Text style={styles.name}>{item.name}</Text>
        
        {item.category && (
          <Text style={styles.category}>📂 {item.category}</Text>
        )}
        
        {(item.street || item.number || item.district || item.city) && (
          <Text style={styles.address}>
            📍 {[
              item.street && item.number ? `${item.street}, ${item.number}` : item.street,
              item.district,
              item.city,
              item.state
            ].filter(Boolean).join(' - ')}
          </Text>
        )}
        
        {item.phone && (
          <Text style={styles.phone}>📞 {item.phone}</Text>
        )}

        {item.latitude && item.longitude && (
          <Text style={styles.gps}>🌐 GPS capturado</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => handleDelete(item.id, item.name)}
      >
        <Text style={styles.deleteText}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  if (establishments.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🏪</Text>
        <Text style={styles.emptyTitle}>Nenhum estabelecimento</Text>
        <Text style={styles.emptySubtitle}>
          Toque em "+ Novo" para adicionar
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={establishments}
      keyExtractor={(item) => item.id.toString()}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  category: {
    fontSize: 14,
    color: '#3b82f6',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  phone: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  gps: {
    fontSize: 12,
    color: '#059669',
    backgroundColor: '#f0f9ff',
    padding: 4,
    borderRadius: 4,
    marginTop: 4,
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  deleteText: {
    fontSize: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: "#6b7280",
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
});