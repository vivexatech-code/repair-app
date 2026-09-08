import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { GuestBrowseProvider } from './src/context/GuestBrowseContext';
import { CartProvider } from './src/context/CartContext';
import { BookingFlowProvider } from './src/context/BookingFlowContext';
import { BookingsProvider } from './src/context/BookingsContext';
import { LocationProvider } from './src/context/LocationContext';
import { AppSettingsProvider } from './src/context/AppSettingsContext';
import {
  RootNavigator,
  rootNavigationRef,
} from './src/navigation/RootNavigator';
import {
  getBookingIdFromNotificationResponse,
  initializeNotifications,
  isExpoGoEnvironment,
} from './src/services/notificationService';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { WebAppShell } from './src/components/WebAppShell';
import { SplashLogoScreen } from './src/screens/location/SplashLogoScreen';
import { colors } from './src/constants/colors';
import { authTimeline, devLog, devWarn } from './src/utils/devLog';

let lastHandledNotificationKey = '';

function navigateToBookingFromNotification(response) {
  const bookingId = getBookingIdFromNotificationResponse(response);
  if (!bookingId) return;

  const key =
    String(response?.notification?.request?.identifier || '') ||
    `${bookingId}:${response?.actionIdentifier || 'default'}`;
  if (key && key === lastHandledNotificationKey) return;
  lastHandledNotificationKey = key;

  const tryNav = (attempts = 0) => {
    try {
      if (rootNavigationRef.isReady()) {
        rootNavigationRef.navigate('BookingDetails', { bookingId });
        return;
      }
    } catch {
      /* nav not ready */
    }
    if (attempts < 24) {
      setTimeout(() => tryNav(attempts + 1), 250);
    }
  };
  tryNav();
}

function AppContent() {
  const { initializing } = useAuth();
  const [splashDone, setSplashDone] = useState(false);

  if (!splashDone) {
    return <SplashLogoScreen onComplete={() => setSplashDone(true)} />;
  }

  if (initializing) {
    return (
      <View style={appShellStyles.root} accessibilityLabel="Loading app">
        <SplashLogoScreen />
      </View>
    );
  }

  return <RootNavigator />;
}

const appShellStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

export default function App() {
  useEffect(() => {
    authTimeline('App started');
    devLog('app', 'mount');
    void (async () => {
      try {
        if (isExpoGoEnvironment()) {
          devLog('app', 'notifications skipped (Expo Go)');
          return;
        }
        await initializeNotifications(navigateToBookingFromNotification);
      } catch (e) {
        devWarn('app', 'initializeNotifications failed', e);
      }
    })();
  }, []);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <WebAppShell>
          <AppSettingsProvider>
            <AuthProvider>
              <GuestBrowseProvider>
                <BookingsProvider>
                  <CartProvider>
                    <BookingFlowProvider>
                      <LocationProvider>
                        <AppContent />
                        <StatusBar style="dark" />
                      </LocationProvider>
                    </BookingFlowProvider>
                  </CartProvider>
                </BookingsProvider>
              </GuestBrowseProvider>
            </AuthProvider>
          </AppSettingsProvider>
        </WebAppShell>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
