// (código existente anterior omitido por brevidade)

// components/ContactList.js
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import { rs } from "../utils/helpers";

export default function ContactList({ onEdit, refreshTrigger }) {
  const db = useSQLiteContext();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadUsers();
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    loadUsers();
  }, [refreshTrigger]);

  async function loadUsers() {
    if (!db) return;
    setLoading(true);
    try {
      const result = await db.getAllAsync(
        `SELECT * FROM users WHERE firstName LIKE ? OR lastName LIKE ? OR email LIKE ? OR phone LIKE ? ORDER BY firstName`,
        [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`]
      );
      setUsers(result);
    } catch (error) {
      Alert.alert("Erro", "Erro ao carregar contatos");
    } finally {
      setLoading(false);
    }
  }

  function confirmDelete(user) {
    Alert.alert(
      "Confirmação",
      `Deseja excluir o contato '${user.firstName} ${user.lastName}'?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => deleteUser(user.id),
        },
      ]
    );
  }

  async function deleteUser(id) {
    try {
      await db.runAsync(`DELETE FROM users WHERE id = ?`, [id]);
      loadUsers();
    } catch (error) {
      Alert.alert("Erro", "Erro ao excluir o contato");
    }
  }

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.firstName[0]}{item.lastName[0]}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.firstName} {item.lastName}</Text>
          <Text style={styles.email}>{item.email}</Text>
          <Text style={styles.phone}>{item.phone}</Text>
        </View>
        <TouchableOpacity style={styles.iconButton} onPress={() => onEdit(item)}>
          <Text style={{ color: "#10b981" }}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={() => confirmDelete(item)}>
          <Text style={{ color: "#ef4444" }}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <>
      <TextInput
        placeholder="🔍 Buscar por nome, e-mail ou telefone"
        value={search}
        onChangeText={setSearch}
        style={styles.searchBar}
      />
      {loading && <ActivityIndicator style={{ marginVertical: 10 }} />}
      <FlatList
        ref={listRef}
        data={users}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: rs.spacing.md }}
        ListEmptyComponent={<Text style={styles.emptyText}>Nenhum contato encontrado</Text>}
      />
    </>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    margin: rs.spacing.md,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    backgroundColor: "#fff",
    fontSize: rs.fontSize.md,
  },
  card: {
    backgroundColor: "#fff",
    padding: rs.spacing.md,
    borderRadius: 12,
    marginBottom: rs.spacing.md,
    elevation: 2,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    backgroundColor: "#3b82f6",
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: rs.spacing.md,
  },
  avatarText: {
    color: "#fff",
    fontWeight: "700",
  },
  name: {
    fontSize: rs.fontSize.lg,
    fontWeight: "600",
    color: "#1f2937",
  },
  email: {
    color: "#6b7280",
  },
  phone: {
    color: "#6b7280",
  },
  iconButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 32,
    color: "#888",
  },
});
