import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as ScreenCapture from 'expo-screen-capture';
import { AuthProvider } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';

export default function App() {
  // Asegurar que el screen sharing/recording NO esta bloqueado.
  // Algun componente o lib puede estar setteando FLAG_SECURE; lo limpiamos
  // explicitamente al montar para que Meet/Teams puedan capturar la app.
  useEffect(() => {
    ScreenCapture.allowAsync().catch(() => {});
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <CartProvider>
            <AppNavigator />
            <StatusBar style="dark" />
          </CartProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
