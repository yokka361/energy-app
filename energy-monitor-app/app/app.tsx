import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import AppNavigator from "./(tabs)/index"; // Adjust the path
import SplashScreenAnimated from "../components/SplashScreen"; // Adjust path as needed
import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync(); // Stops native splash from auto-hiding

export default function App() {
  const [isAppReady, setAppReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const prepareApp = async () => {
      // Simulate resource loading (or do real setup here)
      await new Promise((resolve) => setTimeout(resolve, 500));
      setAppReady(true);
    };
    prepareApp();
  }, []);

  const handleSplashFinish = async () => {
    setShowSplash(false);
    await SplashScreen.hideAsync(); // Hide native splash AFTER animation
  };

  if (!isAppReady) return null;

  if (showSplash) {
    return <SplashScreenAnimated onFinish={handleSplashFinish} />;
  }

  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}
