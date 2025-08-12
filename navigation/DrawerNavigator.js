// navigation/DrawerNavigator.js - DESIGN NUBANK
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Dashboard from '../components/Dashboard';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
  DrawerItem
} from '@react-navigation/drawer';
import CategoryManager from '../components/CategoryManager';
import ExpenseManager from '../components/ExpenseManager';
import IncomeManager from '../components/IncomeManager';
import EstablishmentManager from '../components/EstablishmentManager';
import EstablishmentCategoryManager from '../components/EstablishmentCategoryManager';
import GroupedExpenseList from '../components/GroupedExpenseList';
import AnnualExpenseSummary from '../components/AnnualExpenseSummary';
import PaymentMethodManager from '../components/PaymentMethodManager';
import MonthlyReport from '../components/MonthlyReport';
import ProfileScreen from '../screens/ProfileScreen';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../services/AuthContext';
import {
  NUBANK_COLORS,
  NUBANK_SPACING,
  NUBANK_FONT_SIZES,
  NUBANK_BORDER_RADIUS,
  NUBANK_FONT_WEIGHTS
} from '../constants/nubank-theme';

const Drawer = createDrawerNavigator();

// Componente customizado para o conteúdo do drawer
function CustomDrawerContent(props) {
  const { user, logout } = useAuth();

  const menuItems = [
    { name: 'Dashboard', title: 'Início', icon: 'home' },
    { name: 'Despesas', title: 'Despesas', icon: 'cash-minus' },
    { name: 'Receitas', title: 'Receitas', icon: 'cash-plus' },
    { name: 'Categorias', title: 'Categorias', icon: 'tag-multiple' },
    { name: 'Estabelecimentos', title: 'Estabelecimentos', icon: 'store' },
    { name: 'Categorias de Estabelecimentos', title: 'Categorias de Estabelecimentos', icon: 'store-plus' },
    { name: 'Formas de Pagamento', title: 'Formas de Pagamento', icon: 'credit-card-multiple' },
    { name: 'Resumo Diário', title: 'Resumo Diário', icon: 'calendar-today' },
    { name: 'Resumo Mensal', title: 'Relatório Mensal', icon: 'calendar-month' },
    { name: 'Resumo Anual', title: 'Resumo Anual', icon: 'chart-pie' },
    { name: 'Perfil', title: 'Perfil', icon: 'account-circle' }
  ];

  return (
    <DrawerContentScrollView {...props} style={styles.drawerContent}>
      {/* Header do drawer */}
      <View style={styles.drawerHeader}>
        <View style={styles.userCircle}>
          <MaterialCommunityIcons name='account' size={32} color={NUBANK_COLORS.TEXT_WHITE} />
        </View>
        <Text style={styles.userName}>{user?.name || 'Usuário'}</Text>
        <Text style={styles.userEmail}>{user?.email || ''}</Text>
      </View>

      {/* Itens do menu usando DrawerItem */}
      <View style={styles.drawerItemsContainer}>
        {menuItems.map((item, index) => (
          <DrawerItem
            key={index}
            label={item.title}
            icon={({ color, size }) => (
              <MaterialCommunityIcons name={item.icon} size={24} color={color} />
            )}
            onPress={() => {
              console.log('Navegando para:', item.name);
              props.navigation.navigate(item.name);
            }}
            activeTintColor={NUBANK_COLORS.PRIMARY}
            inactiveTintColor={NUBANK_COLORS.TEXT_PRIMARY}
            activeBackgroundColor={`${NUBANK_COLORS.PRIMARY}15`}
            labelStyle={styles.drawerItemLabel}
            style={styles.drawerItemStyle}
          />
        ))}
      </View>

      {/* Botão de logout */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={() => {
          logout();
        }}
      >
        <MaterialCommunityIcons name='logout' size={20} color={NUBANK_COLORS.PRIMARY} />
        <Text style={styles.logoutText}>Sair</Text>
      </TouchableOpacity>
    </DrawerContentScrollView>
  );
}

export default function DrawerNavigator() {
  return (
    <Drawer.Navigator
      initialRouteName='Dashboard'
      drawerContent={props => <CustomDrawerContent {...props} />}
      screenOptions={{
        // Header estilo Nubank para as demais telas
        headerShown: true,
        headerStyle: {
          backgroundColor: NUBANK_COLORS.PRIMARY,
          elevation: 4,
          shadowOpacity: 0.1,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 }
        },
        headerTintColor: NUBANK_COLORS.TEXT_WHITE,
        headerTitleStyle: {
          fontSize: NUBANK_FONT_SIZES.LG,
          fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD
        },

        // Drawer estilo Nubank
        drawerStyle: {
          backgroundColor: NUBANK_COLORS.BACKGROUND,
          width: 300
        },
        drawerActiveTintColor: NUBANK_COLORS.PRIMARY,
        drawerInactiveTintColor: NUBANK_COLORS.TEXT_PRIMARY,
        drawerActiveBackgroundColor: `${NUBANK_COLORS.PRIMARY}15`,

        // Estilo dos textos do drawer
        drawerLabelStyle: {
          fontSize: NUBANK_FONT_SIZES.MD,
          fontWeight: NUBANK_FONT_WEIGHTS.MEDIUM,
          marginLeft: NUBANK_SPACING.MD
        },

        // Estilo dos itens
        drawerItemStyle: {
          borderRadius: NUBANK_BORDER_RADIUS.LG,
          marginVertical: 4,
          paddingHorizontal: NUBANK_SPACING.MD,
          paddingVertical: NUBANK_SPACING.XS
        }
      }}
    >
      <Drawer.Screen
        name='Dashboard'
        component={Dashboard}
        options={{
          title: 'Início',
          headerShown: false, // Remove o header duplo no Dashboard
          drawerIcon: ({ color }) => <MaterialCommunityIcons name='home' size={24} color={color} />
        }}
      />

      <Drawer.Screen
        name='Despesas'
        component={ExpenseManager}
        options={{
          drawerIcon: ({ color }) => (
            <MaterialCommunityIcons name='cash-minus' size={24} color={color} />
          )
        }}
      />

      <Drawer.Screen
        name='Receitas'
        component={IncomeManager}
        options={{
          drawerIcon: ({ color }) => (
            <MaterialCommunityIcons name='cash-plus' size={24} color={color} />
          )
        }}
      />

      <Drawer.Screen
        name='Categorias'
        component={CategoryManager}
        options={{
          drawerIcon: ({ color }) => (
            <MaterialCommunityIcons name='tag-multiple' size={24} color={color} />
          )
        }}
      />

      <Drawer.Screen
        name='Estabelecimentos'
        component={EstablishmentManager}
        options={{
          drawerIcon: ({ color }) => <MaterialCommunityIcons name='store' size={24} color={color} />
        }}
      />

      <Drawer.Screen
        name='Categorias de Estabelecimentos'
        component={EstablishmentCategoryManager}
        options={{
          title: 'Categorias de Estabelecimentos',
          drawerIcon: ({ color }) => <MaterialCommunityIcons name='store-plus' size={24} color={color} />
        }}
      />

      <Drawer.Screen
        name='Formas de Pagamento'
        component={PaymentMethodManager}
        options={{
          drawerIcon: ({ color }) => (
            <MaterialCommunityIcons name='credit-card-multiple' size={24} color={color} />
          )
        }}
      />

      <Drawer.Screen
        name='Resumo Diário'
        component={GroupedExpenseList}
        options={{
          drawerIcon: ({ color }) => (
            <MaterialCommunityIcons name='calendar-today' size={24} color={color} />
          )
        }}
      />

      <Drawer.Screen
        name='Resumo Mensal'
        component={MonthlyReport}
        options={{
          title: 'Relatório Mensal',
          drawerIcon: ({ color }) => (
            <MaterialCommunityIcons name='calendar-month' size={24} color={color} />
          )
        }}
      />

      <Drawer.Screen
        name='Resumo Anual'
        component={AnnualExpenseSummary}
        options={{
          drawerIcon: ({ color }) => (
            <MaterialCommunityIcons name='chart-pie' size={24} color={color} />
          )
        }}
      />

      <Drawer.Screen
        name='Perfil'
        component={ProfileScreen}
        options={{
          drawerIcon: ({ color }) => (
            <MaterialCommunityIcons name='account-circle' size={24} color={color} />
          )
        }}
      />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  drawerContent: {
    flex: 1
  },
  drawerHeader: {
    backgroundColor: NUBANK_COLORS.PRIMARY,
    paddingTop: 50,
    paddingBottom: NUBANK_SPACING.XL,
    paddingHorizontal: NUBANK_SPACING.LG,
    marginBottom: NUBANK_SPACING.MD
  },
  userCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${NUBANK_COLORS.TEXT_WHITE}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: NUBANK_SPACING.MD
  },
  userName: {
    fontSize: NUBANK_FONT_SIZES.LG,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD,
    color: NUBANK_COLORS.TEXT_WHITE,
    marginBottom: NUBANK_SPACING.XS
  },
  userEmail: {
    fontSize: NUBANK_FONT_SIZES.SM,
    color: `${NUBANK_COLORS.TEXT_WHITE}CC`
  },
  drawerItemsContainer: {
    flex: 1,
    paddingHorizontal: NUBANK_SPACING.SM
  },
  drawerItemStyle: {
    borderRadius: NUBANK_BORDER_RADIUS.LG,
    marginVertical: 2,
    marginHorizontal: NUBANK_SPACING.SM
  },
  drawerItemLabel: {
    fontSize: NUBANK_FONT_SIZES.MD,
    fontWeight: NUBANK_FONT_WEIGHTS.MEDIUM,
    marginLeft: NUBANK_SPACING.SM
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: NUBANK_SPACING.MD,
    marginHorizontal: NUBANK_SPACING.MD,
    marginBottom: NUBANK_SPACING.LG,
    borderTopWidth: 1,
    borderTopColor: NUBANK_COLORS.BACKGROUND_SECONDARY
  },
  logoutText: {
    fontSize: NUBANK_FONT_SIZES.MD,
    fontWeight: NUBANK_FONT_WEIGHTS.MEDIUM,
    color: NUBANK_COLORS.PRIMARY,
    marginLeft: NUBANK_SPACING.MD
  }
});
