import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { HomeScreen } from '../screens/home/HomeScreen';
import { BookingsScreen } from '../screens/bookings/BookingsScreen';
import { ServicesScreen } from '../screens/services/ServicesScreen';
import { AccountScreen } from '../screens/account/AccountScreen';

const Tab = createBottomTabNavigator();

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false, // Hide default labels to use custom ones inside tabBarIcon
        tabBarStyle: styles.tabBar,
        tabBarIcon: ({ focused }) => {
          let iconName;
          let label;

          // Map routes to icons and labels
          if (route.name === 'Home') {
            iconName = 'home';
            label = 'Home';
          } else if (route.name === 'Bookings') {
            iconName = 'calendar';
            label = 'Bookings';
          } else if (route.name === 'Services') {
            iconName = 'grid';
            label = 'Services';
          } else if (route.name === 'Account') {
            iconName = 'person';
            label = 'Account';
          }

          return (
            <View style={[styles.navItem, focused && styles.activeTab]}>
              <Ionicons
                name={iconName}
                size={22}
                color={focused ? '#ffffff' : colors.textSecondary}
              />
              <Text style={[styles.label, focused && styles.labelActive]}>
                {label}
              </Text>
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Bookings" component={BookingsScreen} />
      <Tab.Screen name="Services" component={ServicesScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 85 : 85,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(224, 227, 228, 0.5)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
  },
  // Default state for the nav item container
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    minWidth: 60,
  },
  // Active state for the nav item container
  activeTab: {
    height: 60,
    backgroundColor: colors.primary,
    transform: [{ translateY: -4 }],
  },
  // Default state for the text label
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 4,
  },
  // Active state for the text label
  labelActive: {
    color: '#ffffff',
  },
});