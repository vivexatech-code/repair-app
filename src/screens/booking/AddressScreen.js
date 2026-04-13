import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, ToastAndroid, View } from 'react-native';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Header } from '../../components/Header';
import { SectionHeader } from '../../components/SectionHeader';
import { AddressCard } from '../../components/AddressCard';
import { ServiceCardSkeleton } from '../../components/SkeletonLoader';
import { colors } from '../../constants/colors';
import { spacing, radius, shadows } from '../../constants/spacing';
import { useAuth } from '../../context/AuthContext';
import { useBookingFlow } from '../../context/BookingFlowContext';
import {
  saveCustomerAddresses,
  saveLastUsedAddress,
  subscribeCustomerProfile,
} from '../../services/customerService';

function mapAddressObjectToBookingAddress(obj) {
  if (!obj) return null;
  return {
    line1: obj.fullAddress || '',
    line2: '',
    city: obj.city || '',
    state: '',
    pincode: '',
    lat: obj.lat || null,
    lng: obj.lng || null,
    type: obj.type || 'Home',
  };
}

function makeAddressId() {
  return `addr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function AddressScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { address, setAddress } = useBookingFlow();
  const [customerProfile, setCustomerProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(false);

  useEffect(() => {
    if (!user?.uid) return undefined;
    const unsub = subscribeCustomerProfile(
      user.uid,
      (data) => {
        setCustomerProfile(data);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [user?.uid]);

  const addresses = useMemo(() => {
    const raw = customerProfile?.addresses;
    return Array.isArray(raw) ? raw.slice(0, 3) : [];
  }, [customerProfile?.addresses]);

  const lastAddress = customerProfile?.lastUsedAddress || addresses[0] || null;

  const onSelectAndContinue = async (selected) => {
    const mapped = mapAddressObjectToBookingAddress(selected);
    if (!mapped) return;
    setAddress(mapped);
    if (user?.uid) {
      await saveLastUsedAddress(user.uid, selected);
    }
    navigation.navigate('Schedule');
  };

  const onGps = async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        const msg = 'Location permission denied.';
        if (ToastAndroid?.show) {
          ToastAndroid.show(msg, ToastAndroid.SHORT);
        } else {
          Alert.alert('Permission denied', msg);
        }
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      const places = await Location.reverseGeocodeAsync(pos.coords);
      const p = places[0];
      const fullAddress = [p?.name, p?.street, p?.city, p?.region, p?.postalCode]
        .filter(Boolean)
        .join(', ');
      const addressObj = {
        id: makeAddressId(),
        type: 'Home',
        fullAddress:
          fullAddress || `${pos.coords.latitude}, ${pos.coords.longitude}`,
        city: p?.city || p?.subregion || '',
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      };
      const next = [addressObj, ...addresses]
        .filter(
          (item, idx, arr) =>
            idx === arr.findIndex((x) => x.fullAddress === item.fullAddress),
        )
        .slice(0, 3);
      if (user?.uid) {
        await saveCustomerAddresses(user.uid, next);
        await saveLastUsedAddress(user.uid, addressObj);
      }
      await onSelectAndContinue(addressObj);
    } catch (e) {
      Alert.alert('GPS', e?.message || 'Could not read location');
    } finally {
      setGpsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="Address" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body}>
        <SectionHeader
          title="Where should we visit?"
          subtitle="Pick saved, GPS, or drop a pin on the map."
        />

        {loading ? (
          <>
            <ServiceCardSkeleton />
            <ServiceCardSkeleton />
            <ServiceCardSkeleton />
          </>
        ) : (
          <>
            <AddressCard
              highlighted
              icon="time-outline"
              title="Use last address"
              subtitle={
                lastAddress
                  ? `${lastAddress.type || 'Home'} · ${lastAddress.fullAddress}`
                  : 'No last used address available'
              }
              onPress={() => {
                if (!lastAddress) return;
                onSelectAndContinue(lastAddress);
              }}
            />

            <AddressCard
              icon="home-outline"
              title="Saved addresses"
              subtitle={`${addresses.length} saved — tap to choose`}
              onPress={() =>
                navigation.navigate('AddressList', {
                  addresses,
                  selectedId: address?.id || null,
                })
              }
            />

            <AddressCard
              icon="locate-outline"
              title="Use current location"
              subtitle="Maximum 3 saved addresses — manage in Profile"
              onPress={onGps}
            />

            <AddressCard
              icon="map-outline"
              title="Add on map"
              subtitle="Maximum 3 saved addresses — manage in Profile"
              onPress={() =>
                navigation.navigate('MapPicker', {
                  existingCount: addresses.length,
                })
              }
            />

            {!addresses.length && !lastAddress ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No address saved yet</Text>
                <Text style={styles.emptySub}>
                  Use current location or add on map to continue.
                </Text>
              </View>
            ) : null}
          </>
        )}
        {gpsLoading ? <Text style={styles.loading}>Fetching GPS address...</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  body: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  empty: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
    ...shadows.card,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  loading: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
  },
});
