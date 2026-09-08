import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useGuestBrowse } from '../context/GuestBrowseContext';
import { colors } from '../constants/colors';
import { devLog } from '../utils/devLog';
import { AppBootSkeleton } from '../components/SkeletonLoader';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { ComingSoonServiceScreen } from '../screens/services/ComingSoonServiceScreen';
import { ServiceDetailsScreen } from '../screens/services/ServiceDetailsScreen';
import { LocationGateOverlay } from '../components/LocationGateOverlay';
import { SearchResultsScreen } from '../screens/services/SearchResultsScreen';
import { CategoryServicesScreen } from '../screens/services/CategoryServicesScreen';
import { CartScreen } from '../screens/cart/CartScreen';
import { AddressScreen } from '../screens/booking/AddressScreen';
import { AddressListScreen } from '../screens/booking/AddressListScreen';
import { MapPickerScreen } from '../screens/booking/MapPickerScreen';
import { ScheduleScreen } from '../screens/booking/ScheduleScreen';
import { ConfirmScreen } from '../screens/booking/ConfirmScreen';
import { BookingDetailsScreen } from '../screens/bookings/BookingDetailsScreen';
import { BookingApprovalScreen } from '../screens/bookings/BookingApprovalScreen';
import { AboutModalScreen } from '../screens/about/AboutModalScreen';
import { TermsOfUseScreen } from '../screens/legal/TermsOfUseScreen';
import { PrivacyPolicyScreen } from '../screens/legal/PrivacyPolicyScreen';
import { SupportScreen } from '../screens/support/SupportScreen';
import { SupportTicketScreen } from '../screens/support/SupportTicketScreen';
import { NotificationsScreen } from '../screens/account/NotificationsScreen';
import { OfflineBanner } from '../components/OfflineBanner';

const Stack = createNativeStackNavigator();

export const rootNavigationRef = createNavigationContainerRef();

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen name="ServiceDetails" component={ServiceDetailsScreen} />
      <Stack.Screen name="ComingSoonService" component={ComingSoonServiceScreen} />
      <Stack.Screen
        name="CategoryServices"
        component={CategoryServicesScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
      <Stack.Screen name="Cart" component={CartScreen} />
      <Stack.Screen name="Address" component={AddressScreen} />
      <Stack.Screen name="AddressList" component={AddressListScreen} />
      <Stack.Screen name="MapPicker" component={MapPickerScreen} />
      <Stack.Screen name="Schedule" component={ScheduleScreen} />
      <Stack.Screen name="Confirm" component={ConfirmScreen} />
      <Stack.Screen name="BookingDetails" component={BookingDetailsScreen} />
      <Stack.Screen
        name="BookingApproval"
        component={BookingApprovalScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen name="TermsOfUse" component={TermsOfUseScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
      <Stack.Screen name="SupportTicket" component={SupportTicketScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen
        name="AboutModal"
        component={AboutModalScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
    </Stack.Navigator>
  );
}

function BootShell({ children }) {
  return (
    <View style={styles.shell} accessibilityLabel="Loading app">
      {children}
    </View>
  );
}

export function RootNavigator() {
  const { user, identityResolving } = useAuth();
  const {
    ready: guestReady,
    isGuestBrowse,
    pendingRoute,
    consumePendingRoute,
  } = useGuestBrowse();

  const showApp = Boolean(user) && !identityResolving;
  const showAuth = !showApp && !isGuestBrowse;
  const navKey = showApp ? 'app' : isGuestBrowse ? 'guest' : 'auth';

  useEffect(() => {
    if (!showApp || !guestReady || !user || !pendingRoute?.name) {
      return undefined;
    }
    const t = setTimeout(() => {
      try {
        if (
          rootNavigationRef.isReady() &&
          typeof pendingRoute?.name === 'string' &&
          pendingRoute.name
        ) {
          rootNavigationRef.navigate(pendingRoute.name, pendingRoute.params ?? {});
        }
      } catch {
        /* ignore */
      } finally {
        consumePendingRoute();
      }
    }, 320);
    return () => clearTimeout(t);
  }, [
    showApp,
    guestReady,
    user,
    pendingRoute,
    consumePendingRoute,
  ]);

  if (!guestReady) {
    return (
      <BootShell>
        <AppBootSkeleton />
      </BootShell>
    );
  }

  const tree = showAuth ? <AuthNavigator /> : <AppStack />;

  return (
    <View style={styles.shell}>
      <OfflineBanner />
      <NavigationContainer
        ref={rootNavigationRef}
        key={navKey}
        onReady={() => {
          try {
            devLog('nav', 'container ready', navKey);
          } catch {
            /* ignore */
          }
        }}
      >
        {tree}
        {!showAuth ? <LocationGateOverlay /> : null}
      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    backgroundColor: colors.background,
  },
});
