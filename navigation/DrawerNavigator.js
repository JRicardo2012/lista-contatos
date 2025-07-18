// navigation/DrawerNavigator.js - VERSÃO SIMPLES (SÓ TEXTOS MAIORES)
import Dashboard from '../components/Dashboard';
import { createDrawerNavigator } from '@react-navigation/drawer';
import CategoryManager from '../components/CategoryManager';
import ExpenseManager from '../components/ExpenseManager';
import EstablishmentManager from '../components/EstablishmentManager';
import GroupedExpenseList from '../components/GroupedExpenseList';
import AnnualExpenseSummary from '../components/AnnualExpenseSummary';
import PaymentMethodManager from '../components/PaymentMethodManager';


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
          fontSize: 17, // ⬆️ AUMENTADO
          fontWeight: '700',
        },
        
        // 🎨 DRAWER PERSONALIZADO COM TEXTOS MAIORES
        drawerStyle: {
          backgroundColor: '#FFFFFF',
          width: 320, // ⬆️ LARGURA AUMENTADA PARA ACOMODAR TEXTOS
        },
        drawerActiveTintColor: '#6366F1',
        drawerInactiveTintColor: '#374151',
        drawerActiveBackgroundColor: '#EEF2FF',
        
        // 📝 TEXTOS DO DRAWER - AUMENTADOS
        drawerLabelStyle: {
          fontSize: 17, // ⬆️ MUITO MAIOR (era 16)
          fontWeight: '650', // ⬆️ MAIS BOLD
          marginLeft: -12, // Ajusta posição
          lineHeight: 24,
        },
        
        // 📱 ESTILO DOS ITENS
        drawerItemStyle: {
          borderRadius: 12,
          marginHorizontal: 12,
          
          marginVertical: 4,
          paddingVertical: 8, // ⬆️ MAIS ESPAÇAMENTO
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
          drawerLabel: "💰 Nova Despesa",
          title: "Registrar Despesa"
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
        name="Resumo Anual"
        component={AnnualExpenseSummary}
        options={{ 
          drawerLabel: "📈 Resumo Anual",
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
      
    </Drawer.Navigator>
  );
}