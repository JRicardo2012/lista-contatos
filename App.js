// App.js - COM SPLASH SCREEN ANIMADA
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SQLiteProvider } from 'expo-sqlite';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import MemoryMonitor from './utils/MemoryMonitor';
import eventEmitter from './services/EventEmitter';

// Componentes existentes
import DatabaseInitializer from './components/DatabaseInitializer';
import DrawerNavigator from './navigation/DrawerNavigator';
import SplashScreen from './components/SplashScreen';

// Sistema de autenticação
import { AuthProvider, useAuth } from './services/AuthContext';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';

const Stack = createNativeStackNavigator();

// Navegador de Autenticação
function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName='Login'
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right'
      }}
    >
      <Stack.Screen name='Login' component={LoginScreen} />
      <Stack.Screen name='Register' component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// Navegador Principal
function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#6366F1' />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return user ? <DrawerNavigator /> : <AuthNavigator />;
}

// App principal com Splash Screen
export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Inicia monitoramento
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      MemoryMonitor.start();
    }

    // Limpeza ao desmontar
    return () => {
      MemoryMonitor.stop();
      eventEmitter.removeAllListeners();
    };
  }, []);

  useEffect(() => {
    // Mostra a splash screen por 3 segundos
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Mostra a splash screen
  if (showSplash) {
    return <SplashScreen />;
  }

  // Mostra o app principal
  return (
    <SQLiteProvider databaseName='expenseManager.db'>
      <NavigationContainer>
        <DatabaseInitializer>
          <AuthProvider>
            <AppNavigator />
          </AuthProvider>
        </DatabaseInitializer>
      </NavigationContainer>
    </SQLiteProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280'
  }
});
