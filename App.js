import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import { BookingFlowProvider } from './src/context/BookingFlowContext';
import { BookingsProvider } from './src/context/BookingsContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { registerForPushNotificationsAsync } from './src/services/notificationService';

export default function App() {
  useEffect(() => {
    registerForPushNotificationsAsync().catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <BookingsProvider>
          <CartProvider>
            <BookingFlowProvider>
              <RootNavigator />
              <StatusBar style="dark" />
            </BookingFlowProvider>
          </CartProvider>
        </BookingsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
