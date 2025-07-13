// components/ContactForm.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import { rs, formatPhone, validateEmail } from "../utils/helpers";

export default function ContactForm({ contact, onClose }) {
  const db = useSQLiteContext();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (contact) {
      setFirstName(contact.firstName);
      setLastName(contact.lastName);
      setEmail(contact.email);
      setPhone(contact.phone);
    }
  }, [contact]);

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
  };

  const validateForm = () => {
    if (!firstName || !lastName || !email || !phone) {
      Alert.alert("Erro", "Todos os campos são obrigatórios");
      return false;
    }
    if (!validateEmail(email)) {
      Alert.alert("Erro", "Email inválido");
      return false;
    }
    return true;
  };

  const saveContact = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      if (contact) {
        await db.runAsync(
          `UPDATE users SET firstName=?, lastName=?, email=?, phone=? WHERE id=?`,
          [firstName, lastName, email, phone, contact.id]
        );
      } else {
        await db.runAsync(
          `INSERT INTO users (firstName, lastName, email, phone) VALUES (?, ?, ?, ?)`,
          [firstName, lastName, email, phone]
        );
      }
      onClose();
      resetForm();
    } catch (error) {
      Alert.alert("Erro", "Não foi possível salvar o contato.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.formContainer}>
      <Text style={styles.title}>
        {contact ? "✏️ Editar Contato" : "📇 Novo Contato"}
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>📛 Nome</Text>
        <TextInput
          style={styles.input}
          value={firstName}
          onChangeText={setFirstName}
          placeholder="Digite o nome"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>👤 Sobrenome</Text>
        <TextInput
          style={styles.input}
          value={lastName}
          onChangeText={setLastName}
          placeholder="Digite o sobrenome"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>📧 Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="exemplo@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>📱 Telefone</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={(text) => setPhone(formatPhone(text))}
          placeholder="(99) 99999-9999"
          keyboardType="phone-pad"
          maxLength={15}
        />
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={saveContact} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>💾 Salvar</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
        <Text style={styles.secondaryButtonText}>Cancelar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    padding: rs.spacing.lg,
    margin: rs.spacing.md,
    backgroundColor: "#fff",
    borderRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: rs.fontSize.xl,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: rs.spacing.lg,
    color: "#1f2937",
  },
  inputGroup: {
    marginBottom: rs.spacing.md,
  },
  label: {
    fontWeight: "600",
    fontSize: rs.fontSize.md,
    color: "#374151",
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: rs.spacing.md,
    paddingVertical: rs.spacing.sm,
    fontSize: rs.fontSize.md,
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
