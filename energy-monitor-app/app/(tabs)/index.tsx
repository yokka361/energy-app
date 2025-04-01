import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../../components/HomeScreen';
import TariffScreen from '../../components/TariffScreen';

export type RootStackParamList = {
  Home: undefined;
  Tariff: { powerUsage: number };
};

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="Home">
      <Stack.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ title: 'Smart Power Monitor' }} 
      />
      <Stack.Screen 
        name="Tariff" 
        component={TariffScreen} 
        options={{ title: 'Tariff & Cost Details' }} 
      />
    </Stack.Navigator>
  );
}
