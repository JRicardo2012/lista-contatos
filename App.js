// App.js - CORRIGIDO
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SQLiteProvider } from 'expo-sqlite';
import DatabaseInitializer from './components/DatabaseInitializer';
import DrawerNavigator from './navigation/DrawerNavigator';

export default function App() {
  return (
    <SQLiteProvider databaseName="expenseManager_v3.db">
      <NavigationContainer>
        <DatabaseInitializer>
          {/* SÓ RENDERIZA DEPOIS DO BANCO ESTAR PRONTO */}
          <DrawerNavigator />
        </DatabaseInitializer>
      </NavigationContainer>
    </SQLiteProvider>
  );
}