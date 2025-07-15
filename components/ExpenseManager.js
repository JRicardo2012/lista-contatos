import React from "react";
import { View, StyleSheet } from "react-native";
import ExpenseForm from "./ExpenseForm";

export default function ExpenseManager() {
  function handleExpenseSaved() {
    console.log('✅ Despesa salva com sucesso!');
  }

  return (
    <View style={styles.container}>
      <ExpenseForm onSaved={handleExpenseSaved} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
});