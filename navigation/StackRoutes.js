import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DrawerNavigator from './DrawerNavigator';
import ExpenseManager from '../components/ExpenseManager';

const Stack = createNativeStackNavigator();

export default function StackRoutes() {
  return (
    <Stack.Navigator initialRouteName='Home' screenOptions={{ headerShown: false }}>
      <Stack.Screen name='Home' component={DrawerNavigator} />
      <Stack.Screen name='Nova Despesa' component={ExpenseManager} />
    </Stack.Navigator>
  );
}
