import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { colors } from '../constants/colors';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { ServiceDetailsScreen } from '../screens/services/ServiceDetailsScreen';
import { CartScreen } from '../screens/cart/CartScreen';
import { AddressScreen } from '../screens/booking/AddressScreen';
import { AddressListScreen } from '../screens/booking/AddressListScreen';
import { MapPickerScreen } from '../screens/booking/MapPickerScreen';
import { ScheduleScreen } from '../screens/booking/ScheduleScreen';
import { ConfirmScreen } from '../screens/booking/ConfirmScreen';
import { BookingDetailsScreen } from '../screens/bookings/BookingDetailsScreen';
import { SupportChatScreen } from '../screens/support/SupportChatScreen';
import { AboutModalScreen } from '../screens/about/AboutModalScreen';
import { TermsOfUseScreen } from '../screens/legal/TermsOfUseScreen';
import { PrivacyPolicyScreen } from '../screens/legal/PrivacyPolicyScreen';

const Stack = createNativeStackNavigator();

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen name="ServiceDetails" component={ServiceDetailsScreen} />
      <Stack.Screen name="Cart" component={CartScreen} />
      <Stack.Screen name="Address" component={AddressScreen} />
      <Stack.Screen name="AddressList" component={AddressListScreen} />
      <Stack.Screen name="MapPicker" component={MapPickerScreen} />
      <Stack.Screen name="Schedule" component={ScheduleScreen} />
      <Stack.Screen name="Confirm" component={ConfirmScreen} />
      <Stack.Screen name="BookingDetails" component={BookingDetailsScreen} />
      <Stack.Screen name="SupportChat" component={SupportChatScreen} />
      <Stack.Screen name="TermsOfUse" component={TermsOfUseScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
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

export function RootNavigator() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <AppStack /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
