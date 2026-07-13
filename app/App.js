import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { useFonts, EBGaramond_400Regular, EBGaramond_500Medium, EBGaramond_600SemiBold } from '@expo-google-fonts/eb-garamond';
import { PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans';
import { DancingScript_500Medium, DancingScript_600SemiBold } from '@expo-google-fonts/dancing-script';
import { Caveat_700Bold } from '@expo-google-fonts/caveat';
import { GreatVibes_400Regular } from '@expo-google-fonts/great-vibes';

import RootNavigator from './src/navigation/RootNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';

// Import Firebase config to initialize it on app start
import './src/services/firebaseConfig';

export default function App() {
  const [fontsLoaded] = useFonts({
    EBGaramond_400Regular,
    EBGaramond_500Medium,
    EBGaramond_600SemiBold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    DancingScript_500Medium,
    DancingScript_600SemiBold,
    Caveat_700Bold,
    GreatVibes_400Regular,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <NavigationContainer>
        <StatusBar style="light" />
        <RootNavigator />
      </NavigationContainer>
    </ErrorBoundary>
  );
}
