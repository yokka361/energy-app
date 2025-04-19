import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './(tabs)/index'; // Adjust the path

export default function App() {
  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );

  
}
