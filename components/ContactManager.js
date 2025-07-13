// components/ContactManager.js
import React, { useState } from "react";
import { View, SafeAreaView, StatusBar, TouchableOpacity, Text, StyleSheet } from "react-native";
import ContactList from "./ContactList";
import ContactForm from "./ContactForm";
import { rs } from "../utils/helpers";

export default function ContactManager() {
  const [showForm, setShowForm] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [refreshList, setRefreshList] = useState(false);

  const handleEdit = (contact) => {
    setSelectedContact(contact);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setSelectedContact(null);
    setShowForm(false);
    setRefreshList((prev) => !prev);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {showForm ? (
        <ContactForm
          contact={selectedContact}
          onClose={handleFormClose}
        />
      ) : (
        <>
          <ContactList
            onEdit={handleEdit}
            refreshTrigger={refreshList}
          />
          <TouchableOpacity style={styles.fab} onPress={() => setShowForm(true)}>
            <Text style={styles.fabIcon}>＋</Text>
          </TouchableOpacity>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
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
});
