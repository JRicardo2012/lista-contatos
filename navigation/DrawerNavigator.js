// navigation/DrawerNavigator.js - VERSÃO COMPLETA COM AUTENTICAÇÃO
import Dashboard from '../components/Dashboard';
import { createDrawerNavigator } from '@react-navigation/drawer';
import CategoryManager from '../components/CategoryManager';
import ExpenseManager from '../components/ExpenseManager';
import EstablishmentManager from '../components/EstablishmentManager';
import GroupedExpenseList from '../components/GroupedExpenseList';
import AnnualExpenseSummary from '../components/AnnualExpenseSummary';
import PaymentMethodManager from '../components/PaymentMethodManager';
import MonthlyReport from '../components/MonthlyReport';
import ProfileScreen from '../screens/ProfileScreen'; // NOVO IMPORT

const Drawer = createDrawerNavigator();

export default function DrawerNavigator() {
  return (
    <Drawer.Navigator 
      initialRouteName="Dashboard"
      screenOptions={{
        // 🎨 HEADER PERSONALIZADO
        headerShown: true,
        headerStyle: {
          backgroundColor: '#6366F1',
          elevation: 4,
          shadowOpacity: 0.3,
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontSize: 17,
          fontWeight: '700',
        },
        
        // 🎨 DRAWER PERSONALIZADO COM TEXTOS MAIORES
        drawerStyle: {
          backgroundColor: '#FFFFFF',
          width: 320,
        },
        drawerActiveTintColor: '#6366F1',
        drawerInactiveTintColor: '#374151',
        drawerActiveBackgroundColor: '#EEF2FF',
        
        // 📝 TEXTOS DO DRAWER - AUMENTADOS
        drawerLabelStyle: {
          fontSize: 17,
          fontWeight: '650',
          marginLeft: -12,
          lineHeight: 24,
        },
        
        // 📱 ESTILO DOS ITENS
        drawerItemStyle: {
          borderRadius: 12,
          marginHorizontal: 12,
          marginVertical: 4,
          paddingVertical: 8,
        },
        
        // 🎯 TIPO DO DRAWER
        drawerType: 'front',
        overlayColor: 'rgba(0, 0, 0, 0.5)',
      }}
    >
      <Drawer.Screen
        name="Dashboard"
        component={Dashboard}
        options={{ 
          drawerLabel: "🏠 Dashboard",
          title: "Dashboard Financeiro"
        }}
      />
      <Drawer.Screen
        name="Despesas"
        component={ExpenseManager}
        options={{ 
          drawerLabel: "💰 Gerenciar Despesas",
          title: "Gerenciador de Despesas"
        }}
      />
      <Drawer.Screen
        name="Resumo Diário"
        component={GroupedExpenseList}
        options={{ 
          drawerLabel: "📊 Resumo Diário",
          title: "Últimos 7 Dias"
        }}
      />
      <Drawer.Screen
        name="Relatório Mensal"
        component={MonthlyReport}
        options={{ 
          drawerLabel: "📈 Relatório Mensal",
          title: "Análise Mensal"
        }}
      />
      <Drawer.Screen
        name="Resumo Anual"
        component={AnnualExpenseSummary}
        options={{ 
          drawerLabel: "📅 Resumo Anual",
          title: "Análise Anual"
        }}
      />
      <Drawer.Screen
        name="Estabelecimentos"
        component={EstablishmentManager}
        options={{ 
          drawerLabel: "🏪 Estabelecimentos",
          title: "Gerenciar Locais"
        }}
      />
      <Drawer.Screen
        name="Categorias"
        component={CategoryManager}
        options={{ 
          drawerLabel: "📂 Categorias",
          title: "Organizar Despesas"
        }}
      />
      <Drawer.Screen
        name="Formas de Pagamento"
        component={PaymentMethodManager}
        options={{ 
          drawerLabel: "💳 Formas de Pagamento",
          title: "Métodos de Pagamento"
        }}
      />
      {/* NOVA TELA DE PERFIL */}
      <Drawer.Screen
        name="Perfil"
        component={ProfileScreen}
        options={{ 
          drawerLabel: "👤 Meu Perfil",
          title: "Perfil do Usuário"
        }}
      />
    </Drawer.Navigator>
  );
}