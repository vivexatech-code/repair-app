import React, { useEffect, useMemo, useState } from 'react';
import { 
  Alert, 
  ScrollView, 
  StyleSheet, 
  Text, 
  ToastAndroid, 
  View,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  useWindowDimensions
} from 'react-native';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// External contexts and services
import { useAuth } from '../../context/AuthContext';
import { useBookingFlow } from '../../context/BookingFlowContext';
import {
  saveCustomerAddresses,
  saveLastUsedAddress,
  subscribeCustomerProfile,
} from '../../services/customerService';
import {
  loadCustomerProfileCache,
  saveCustomerProfileCache,
} from '../../utils/customerProfileCache';
import {
  isStoredLocationFresh,
  loadStoredUserLocation,
  saveStoredUserLocation,
  storedLocationToBookingAddress,
} from '../../utils/userLocationCache';
import { SkeletonLoader } from '../../components/SkeletonLoader';
import { savedAddressToBookingAddress } from '../../utils/address';

// Extracted Theme Colors to match target design
const theme = {
  primary: '#C45508',
  primaryContainer: '#ff7946',
  surface: '#f5f6f7',
  surfaceLowest: '#ffffff',
  surfaceLow: '#eff1f2',
  surfaceHigh: '#e0e3e4',
  surfaceVariant: '#dadddf',
  onSurface: '#2c2f30',
  onSurfaceVariant: '#595c5d',
  outlineVariant: '#abadae',
  error: '#b31b25',
  success: '#16a34a',
};

function mapAddressObjectToBookingAddress(obj) {
  return savedAddressToBookingAddress(obj);
}

function makeAddressId() {
  return `addr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function AddressScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;

  const navigation = useNavigation();
  const { user } = useAuth();
  const { address, setAddress } = useBookingFlow();
  
  const [customerProfile, setCustomerProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;

    (async () => {
      const cached = await loadCustomerProfileCache(user.uid);
      if (cancelled || !cached) return;
      setCustomerProfile(cached);
      setLoading(false);
    })();

    const unsub = subscribeCustomerProfile(
      user.uid,
      (data) => {
        setCustomerProfile(data);
        setLoading(false);
        if (data && user.uid) {
          saveCustomerProfileCache(user.uid, data);
        }
      },
      () => setLoading(false),
    );
    return () => {
      cancelled = true;
      unsub();
    };
  }, [user?.uid]);

  const addresses = useMemo(() => {
    const raw = customerProfile?.addresses;
    return Array.isArray(raw) ? raw.slice(0, 10) : [];
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
      const cached = await loadStoredUserLocation();
      if (cached && isStoredLocationFresh(cached)) {
        const addressObj = storedLocationToBookingAddress(cached);
        await onSelectAndContinue(addressObj);
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        const msg = 'Location permission denied.';
        if (Platform.OS === 'android' && ToastAndroid?.show) {
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
        fullAddress: fullAddress || `${pos.coords.latitude}, ${pos.coords.longitude}`,
        city: p?.city || p?.subregion || '',
        state: p?.region || '',
        pincode: p?.postalCode || '',
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      };

      await saveStoredUserLocation({
        locationLabel: addressObj.fullAddress,
        address: addressObj.fullAddress,
        city: addressObj.city,
        state: addressObj.state,
        pincode: addressObj.pincode,
        coords: pos.coords,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        permissionStatus: status,
      });
      
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
      Alert.alert('GPS Error', e?.message || 'Could not read location');
    } finally {
      setGpsLoading(false);
    }
  };

  const onRefreshGps = async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission denied.');
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
        fullAddress: fullAddress || `${pos.coords.latitude}, ${pos.coords.longitude}`,
        city: p?.city || p?.subregion || '',
        state: p?.region || '',
        pincode: p?.postalCode || '',
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      };
      await saveStoredUserLocation({
        locationLabel: addressObj.fullAddress,
        address: addressObj.fullAddress,
        city: addressObj.city,
        state: addressObj.state,
        pincode: addressObj.pincode,
        coords: pos.coords,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        permissionStatus: status,
      });
      if (user?.uid) {
        await saveLastUsedAddress(user.uid, addressObj);
      }
      await onSelectAndContinue(addressObj);
    } catch (e) {
      Alert.alert('GPS Error', e?.message || 'Could not refresh location');
    } finally {
      setGpsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.surface} />

      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={theme.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Service Location</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          isTablet && styles.scrollContentTablet,
        ]}
      >
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Where should we visit?</Text>
          <Text style={styles.heroSubtitle}>Select a saved address, use your current location, or drop a pin on the map.</Text>
        </View>

        {loading && !customerProfile ? (
          <View style={styles.loadingContainer}>
            <AddressLoadingSkeleton />
          </View>
        ) : (
          <View style={styles.listContainer}>
            
            {/* Quick Actions (Last Used & Saved) */}
            {lastAddress && (
              <ActionCard
                isPrimary
                icon="restore"
                title="Recent location"
                subtitle={`${lastAddress.type || 'Home'} · ${lastAddress.fullAddress}`}
                onPress={() => onSelectAndContinue(lastAddress)}
              />
            )}

            <ActionCard
              icon="bookmarks"
              title="Saved addresses"
              subtitle={`${addresses.length} saved location${addresses.length !== 1 ? 's' : ''} — select, edit, or delete`}
              onPress={() => navigation.navigate('AddressList', {
                addresses,
                selectedId: address?.id || null,
              })}
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR ADD NEW</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* New Location Actions */}
            <ActionCard
              icon="my-location"
              title="Use current location"
              subtitle="Instant from saved location"
              onPress={onGps}
              isLoading={gpsLoading}
            />

            <ActionCard
              icon="refresh"
              title="Refresh location"
              subtitle="Fetch a new GPS reading"
              onPress={onRefreshGps}
              isLoading={gpsLoading}
            />

            <ActionCard
              icon="add-location-alt"
              title="Add on map"
              subtitle="Pinpoint your location manually"
              onPress={() => navigation.navigate('MapPicker', {
                existingCount: addresses.length,
              })}
            />

            {!addresses.length && !lastAddress ? (
              <View style={styles.emptyCard}>
                <MaterialIcons name="info-outline" size={24} color={theme.onSurfaceVariant} />
                <View style={styles.emptyCardContent}>
                  <Text style={styles.emptyTitle}>No addresses saved yet</Text>
                  <Text style={styles.emptySub}>Use your current location or map to get started.</Text>
                </View>
              </View>
            ) : null}

          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Sub-Components ---

const ActionCard = ({ icon, title, subtitle, onPress, isPrimary, isLoading }) => (
  <TouchableOpacity
    activeOpacity={0.8}
    onPress={onPress}
    disabled={isLoading}
    style={[
      styles.card,
      isPrimary && styles.cardPrimary
    ]}
  >
    <View style={[styles.iconWrapper, isPrimary && styles.iconWrapperPrimary]}>
      {isLoading ? (
        <SkeletonLoader width={22} height={22} borderRadius={11} />
      ) : (
        <MaterialIcons 
          name={icon} 
          size={24} 
          color={isPrimary ? theme.primary : theme.onSurfaceVariant} 
        />
      )}
    </View>
    
    <View style={styles.cardContent}>
      <Text style={[styles.cardTitle, isPrimary && { color: theme.primary }]}>{title}</Text>
      <Text style={styles.cardSubtitle} numberOfLines={2}>{subtitle}</Text>
    </View>

    {!isLoading && (
      <MaterialIcons name="chevron-right" size={20} color={theme.outlineVariant} />
    )}
  </TouchableOpacity>
);

const AddressLoadingSkeleton = () => (
  <View style={styles.listContainer}>
    {[1, 2, 3].map((item) => (
      <View key={item} style={styles.card}>
        <SkeletonLoader width={48} height={48} borderRadius={24} />
        <View style={styles.cardContent}>
          <SkeletonLoader height={16} width="50%" />
          <SkeletonLoader height={12} width="90%" style={{ marginTop: 8 }} />
        </View>
      </View>
    ))}
  </View>
);

// --- Styles ---

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.surface,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.surfaceHigh,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: theme.surfaceLowest,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.onSurface,
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 60,
  },
  scrollContentTablet: {
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  
  /* --- Hero Section --- */
  heroSection: {
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.onSurface,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 15,
    color: theme.onSurfaceVariant,
    lineHeight: 22,
  },
  
  /* --- States & Lists --- */
  loadingContainer: {
    paddingVertical: 8,
  },
  listContainer: {
    gap: 16,
  },

  /* --- Action Card --- */
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceLowest,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.surfaceHigh,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 12,
    elevation: 2,
    gap: 16,
  },
  cardPrimary: {
    borderColor: 'rgba(165, 53, 0, 0.3)',
    backgroundColor: theme.surfaceLowest,
    shadowColor: theme.primary,
    shadowOpacity: 0.05,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapperPrimary: {
    backgroundColor: 'rgba(165, 53, 0, 0.1)',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.onSurface,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: theme.onSurfaceVariant,
    lineHeight: 18,
  },

  /* --- Divider --- */
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    paddingHorizontal: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.surfaceHigh,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: theme.outlineVariant,
    marginHorizontal: 12,
    letterSpacing: 1,
  },

  /* --- Empty State Box --- */
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.surfaceLow,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    gap: 12,
  },
  emptyCardContent: {
    flex: 1,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.onSurface,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    color: theme.onSurfaceVariant,
    lineHeight: 18,
  },
});