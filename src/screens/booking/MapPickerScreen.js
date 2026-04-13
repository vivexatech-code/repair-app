import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Header } from '../../components/Header';
import { Button } from '../../components/Button';
import { colors } from '../../constants/colors';
import { radius, shadows, spacing } from '../../constants/spacing';
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
    id: obj.id,
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

export function MapPickerScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { setAddress } = useBookingFlow();
  const [pin, setPin] = useState({ lat: 28.4595, lng: 77.0266 });
  const [label, setLabel] = useState('Tap map area to move pin');
  const [saving, setSaving] = useState(false);

  const onSimulateMapTap = async () => {
    const jitter = () => (Math.random() - 0.5) * 0.02;
    const lat = Number((pin.lat + jitter()).toFixed(6));
    const lng = Number((pin.lng + jitter()).toFixed(6));
    setPin({ lat, lng });
    try {
      const places = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const p = places[0];
      const full = [p?.name, p?.street, p?.city, p?.region, p?.postalCode]
        .filter(Boolean)
        .join(', ');
      setLabel(full || `${lat}, ${lng}`);
    } catch {
      setLabel(`${lat}, ${lng}`);
    }
  };

  const onSave = async () => {
    if (!user?.uid) return;
    setSaving(true);
    try {
      const fullAddress = label || `${pin.lat}, ${pin.lng}`;
      const addr = {
        id: makeAddressId(),
        type: 'Home',
        fullAddress,
        city: fullAddress.split(',').slice(-2, -1)[0]?.trim() || '',
        lat: pin.lat,
        lng: pin.lng,
      };

      const profile = await new Promise((resolve) => {
        const unsub = subscribeCustomerProfile(
          user.uid,
          (data) => {
            unsub();
            resolve(data);
          },
          () => resolve(null),
        );
      });
      const existing = Array.isArray(profile?.addresses) ? profile.addresses : [];
      const next = [addr, ...existing]
        .filter((item, idx, arr) => idx === arr.findIndex((x) => x.fullAddress === item.fullAddress))
        .slice(0, 3);

      await saveCustomerAddresses(user.uid, next);
      await saveLastUsedAddress(user.uid, addr);
      setAddress(mapAddressObjectToBookingAddress(addr));
      navigation.navigate('Schedule');
    } catch (e) {
      Alert.alert('Map', e?.message || 'Could not save selected location.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="Add on map" onBack={() => navigation.goBack()} />
      <View style={styles.body}>
        <Pressable style={styles.mapArea} onPress={onSimulateMapTap}>
          <Text style={styles.mapHint}>Map placeholder</Text>
          <Text style={styles.mapSub}>Tap anywhere to move pin</Text>
          <Text style={styles.pin}>Pin: {pin.lat}, {pin.lng}</Text>
        </Pressable>
        <View style={styles.info}>
          <Text style={styles.infoTitle}>Selected address</Text>
          <Text style={styles.infoSub}>{label}</Text>
        </View>
        <Button title="Save address & continue" onPress={onSave} loading={saving} />
      </View>
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
    paddingBottom: spacing.xl,
    flex: 1,
  },
  mapArea: {
    height: 280,
    borderRadius: radius.lg,
    backgroundColor: '#F1EFEA',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  mapHint: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  mapSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  pin: {
    marginTop: spacing.sm,
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  info: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.card,
  },
  infoTitle: {
    fontSize: 13,
    textTransform: 'uppercase',
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  infoSub: {
    fontSize: 15,
    color: colors.text,
  },
});
