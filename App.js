// App.js
import React from "react";
import { SQLiteProvider } from "expo-sqlite";
import ContactManager from "./components/ContactManager";
import { applyMigrations } from "./db/database";

export default function App() {
  return (
    <SQLiteProvider databaseName="contacts.db" onInit={applyMigrations}>
      <ContactManager />
    </SQLiteProvider>
  );
}