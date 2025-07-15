import { createDrawerNavigator } from '@react-navigation/drawer';
import CategoryManager from '../components/CategoryManager';
import ExpenseManager from '../components/ExpenseManager';
import EstablishmentManager from '../components/EstablishmentManager';
import GroupedExpenseList from '../components/GroupedExpenseList';
import AnnualExpenseSummary from '../components/AnnualExpenseSummary'; 

const Drawer = createDrawerNavigator();

export default function DrawerNavigator() {
  return (
    <Drawer.Navigator initialRouteName="Despesas">
      <Drawer.Screen
        name="Despesas"
        component={ExpenseManager}
        options={{ drawerLabel: "💰 Despesas" }}
      />
      <Drawer.Screen
        name="Resumo Diário"
        component={GroupedExpenseList}
        options={{ drawerLabel: "📊 Resumo Diário" }}
      />
      {/* 👇 NOVA TELA ADICIONADA */}
      <Drawer.Screen
        name="Resumo Anual"
        component={AnnualExpenseSummary}
        options={{ drawerLabel: "📈 Resumo Anual" }}
      />
      <Drawer.Screen
        name="Estabelecimentos"
        component={EstablishmentManager}
        options={{ drawerLabel: "🏪 Estabelecimentos" }}
      />
      <Drawer.Screen
        name="Categorias"
        component={CategoryManager}
        options={{ drawerLabel: "📂 Categorias" }}
      />
    </Drawer.Navigator>
  );
}