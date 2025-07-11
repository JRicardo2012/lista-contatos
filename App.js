import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
  PixelRatio,
  ActivityIndicator,
} from "react-native";
import { SQLiteProvider, useSQLiteContext } from "expo-sqlite";
import { MaterialIcons } from "@expo/vector-icons";

const { width: screenWidth } = Dimensions.get("window");

const rs = {
  scale: (size) =>
    Math.round(PixelRatio.roundToNearestPixel((screenWidth / 375) * size)),
  spacing: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  fontSize: {
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
  },
  buttonHeight: 50,
};

async function applyMigrations(db) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firstName TEXT,
      lastName TEXT,
      email TEXT UNIQUE,
      phone TEXT
    );
  `);
}

function formatPhone(value) {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  }
  return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
}

function ContactApp() {
  const db = useSQLiteContext();
  const [contacts, setContacts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (db) loadContacts();
  }, [db]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (db) loadContacts();
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  async function loadContacts() {
    const result = await db.getAllAsync(
      `SELECT * FROM users 
       WHERE firstName LIKE ? OR lastName LIKE ? OR email LIKE ? OR phone LIKE ?
       ORDER BY firstName`,
      [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`]
    );
    setContacts(result);
  }

  function resetForm() {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setEditing(null);
  }

  function validateForm() {
    if (!firstName || !lastName || !email || !phone) {
      Alert.alert("Erro", "Todos os campos são obrigatórios");
      return false;
    }
    return true;
  }

  async function saveContact() {
    if (!validateForm()) return;
    setLoading(true);
    try {
      if (editing) {
        await db.runAsync(
          "UPDATE users SET firstName=?, lastName=?, email=?, phone=? WHERE id=?",
          [firstName, lastName, email, phone, editing.id]
        );
      } else {
        await db.runAsync(
          "INSERT INTO users (firstName, lastName, email, phone) VALUES (?, ?, ?, ?)",
          [firstName, lastName, email, phone]
        );
      }
      resetForm();
      setShowForm(false);
      loadContacts();
    } catch (e) {
      Alert.alert("Erro", "Falha ao salvar o contato");
    } finally {
      setLoading(false);
    }
  }

  async function deleteContact(id) {
    await db.runAsync("DELETE FROM users WHERE id = ?", [id]);
    loadContacts();
  }

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.firstName[0]}
            {item.lastName[0]}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>
            {item.firstName} {item.lastName}
          </Text>
          <Text style={styles.email}>{item.email}</Text>
          <Text style={styles.phone}>{item.phone}</Text>
        </View>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => {
            setEditing(item);
            setFirstName(item.firstName);
            setLastName(item.lastName);
            setEmail(item.email);
            setPhone(item.phone);
            setShowForm(true);
          }}
        >
          <MaterialIcons name="edit" size={24} color="#10b981" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => deleteContact(item.id)}
        >
          <MaterialIcons name="delete" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (showForm) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.formContainer}>
          <Text style={styles.titleCentered}>
            {editing ? "✏️ Editar Contato" : "📇 Novo Contato"}
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>📛 Nome</Text>
            <TextInput
              style={styles.inputStyled}
              placeholder="Digite o nome"
              value={firstName}
              onChangeText={setFirstName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>👤 Sobrenome</Text>
            <TextInput
              style={styles.inputStyled}
              placeholder="Digite o sobrenome"
              value={lastName}
              onChangeText={setLastName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>📧 Email</Text>
            <TextInput
              style={styles.inputStyled}
              placeholder="exemplo@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>📱 Telefone</Text>
            <TextInput
              style={styles.inputStyled}
              placeholder="(99) 99999-9999"
              value={phone}
              onChangeText={(text) => setPhone(formatPhone(text))}
              keyboardType="phone-pad"
              maxLength={15}
            />
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={saveContact}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>💾 Salvar</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              setShowForm(false);
              resetForm();
            }}
          >
            <Text style={styles.secondaryButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <TextInput
        placeholder="🔍 Buscar por nome, e-mail ou telefone"
        value={search}
        onChangeText={setSearch}
        style={{
          margin: rs.spacing.md,
          padding: 12,
          borderWidth: 1,
          borderColor: "#ddd",
          borderRadius: 10,
          backgroundColor: "#fff",
          fontSize: rs.fontSize.md,
        }}
      />

      <FlatList
        data={contacts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: rs.spacing.md }}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 32, color: "#888" }}>
            Nenhum contato encontrado
          </Text>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowForm(true)}
      >
        <Text style={styles.fabIcon}>＋</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SQLiteProvider databaseName="contacts.db" onInit={applyMigrations}>
      <ContactApp />
    </SQLiteProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
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
  fab: {
    position: "absolute",
    right: rs.spacing.lg,
    bottom: rs.spacing.xl,
    backgroundColor: "#3b82f6",
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },
  fabIcon: {
    fontSize: 30,
    color: "#fff",
  },
  formContainer: {
    padding: rs.spacing.lg,
    backgroundColor: "#fff",
    margin: rs.spacing.md,
    borderRadius: 12,
    elevation: 4,
  },
  titleCentered: {
    fontSize: rs.fontSize.xl,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: rs.spacing.lg,
    color: "#1f2937",
  },
  inputGroup: {
    marginBottom: rs.spacing.md,
  },
  inputStyled: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: rs.spacing.md,
    paddingVertical: rs.spacing.sm,
    fontSize: rs.fontSize.md,
  },
  label: {
    fontWeight: "600",
    fontSize: rs.fontSize.md,
    color: "#374151",
    marginBottom: 4,
  },
  primaryButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: rs.spacing.md,
    borderRadius: 10,
    alignItems: "center",
    marginTop: rs.spacing.lg,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: rs.fontSize.lg,
    fontWeight: "600",
  },
  secondaryButton: {
    marginTop: rs.spacing.md,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#6b7280",
    fontSize: rs.fontSize.md,
  },
});
