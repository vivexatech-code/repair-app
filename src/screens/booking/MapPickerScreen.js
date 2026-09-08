import React, { useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import MapView, { Marker } from '../../components/maps/AppMapView';
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
import {
  normalizeSavedAddress,
  savedAddressToBookingAddress,
} from '../../utils/address';

function makeAddressId() {
  return `addr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function placeParts(p) {
  return {
    city: p?.city || p?.subregion || '',
    state: p?.region || '',
    pincode: p?.postalCode || '',
    full: [p?.name, p?.street, p?.city, p?.region, p?.postalCode]
      .filter(Boolean)
      .join(', '),
  };
}

export function MapPickerScreen() {
  const isWeb = Platform.OS === 'web';
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { setAddress } = useBookingFlow();
  const editAddress = route.params?.editAddress
    ? normalizeSavedAddress(route.params.editAddress)
    : null;
  const manageOnly = Boolean(route.params?.manageOnly);

  const [pin, setPin] = useState({
    lat: Number(editAddress?.lat) || 28.4595,
    lng: Number(editAddress?.lng) || 77.0266,
  });
  const [label, setLabel] = useState(editAddress?.fullAddress || 'Move the pin to choose address');
  const [city, setCity] = useState(editAddress?.city || '');
  const [stateName, setStateName] = useState(editAddress?.state || '');
  const [pincode, setPincode] = useState(editAddress?.pincode || '');
  const [addressType, setAddressType] = useState(editAddress?.type || 'Home');
  const [houseFlat, setHouseFlat] = useState(editAddress?.houseFlat || '');
  const [landmark, setLandmark] = useState(editAddress?.landmark || '');
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (editAddress) return undefined;
    let active = true;
    (async () => {
      try {
        setLocating(true);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const current = await Location.getCurrentPositionAsync({});
        if (!active) return;
        const nextPin = {
          lat: current.coords.latitude,
          lng: current.coords.longitude,
        };
        setPin(nextPin);
        const places = await Location.reverseGeocodeAsync({
          latitude: nextPin.lat,
          longitude: nextPin.lng,
        });
        const parts = placeParts(places[0]);
        setLabel(parts.full || `${nextPin.lat}, ${nextPin.lng}`);
        setCity(parts.city);
        setStateName(parts.state);
        setPincode(parts.pincode);
      } catch {
        // keep default region
      } finally {
        if (active) setLocating(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [editAddress]);

  useEffect(() => {
    if (!isWeb) return undefined;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const places = await Location.reverseGeocodeAsync({
          latitude: pin.lat,
          longitude: pin.lng,
        });
        if (cancelled) return;
        const parts = placeParts(places?.[0]);
        setLabel(parts.full || `${pin.lat}, ${pin.lng}`);
        setCity(parts.city);
        setStateName(parts.state);
        setPincode(parts.pincode);
      } catch {
        if (!cancelled) setLabel(`${pin.lat}, ${pin.lng}`);
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [isWeb, pin.lat, pin.lng]);

  const onMapPress = async (e) => {
    const latRaw = e?.nativeEvent?.coordinate?.latitude;
    const lngRaw = e?.nativeEvent?.coordinate?.longitude;
    if (latRaw == null || lngRaw == null) return;
    const lat = Number(Number(latRaw).toFixed(6));
    const lng = Number(Number(lngRaw).toFixed(6));
    setPin({ lat, lng });
    try {
      const places = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const parts = placeParts(places[0]);
      setLabel(parts.full || `${lat}, ${lng}`);
      setCity(parts.city);
      setStateName(parts.state);
      setPincode(parts.pincode);
    } catch {
      setLabel(`${lat}, ${lng}`);
    }
  };

  const onSave = async () => {
    if (!user?.uid) {
      Alert.alert('Sign in required', 'Please sign in to save an address.');
      return;
    }
    setSaving(true);
    try {
      const baseLabel = label || `${pin.lat}, ${pin.lng}`;
      const addr = normalizeSavedAddress({
        id: editAddress?.id || makeAddressId(),
        type: addressType || 'Home',
        fullAddress: [houseFlat.trim(), baseLabel, landmark.trim()].filter(Boolean).join(', '),
        city: city.trim(),
        state: stateName.trim(),
        pincode: pincode.trim(),
        lat: pin.lat,
        lng: pin.lng,
        houseFlat: houseFlat.trim(),
        landmark: landmark.trim(),
      });

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
      let next;
      if (editAddress?.id) {
        const replaced = existing.some((x) => x.id === editAddress.id);
        next = replaced
          ? existing.map((x) => (x.id === editAddress.id ? addr : x))
          : [addr, ...existing];
      } else {
        next = [addr, ...existing].filter(
          (item, idx, arr) => idx === arr.findIndex((x) => x.id === item.id || x.fullAddress === item.fullAddress),
        );
      }
      next = next.slice(0, 10);

      await saveCustomerAddresses(user.uid, next);
      await saveLastUsedAddress(user.uid, addr);

      if (manageOnly) {
        navigation.goBack();
        return;
      }

      setAddress(savedAddressToBookingAddress(addr));
      navigation.navigate('Schedule');
    } catch (e) {
      Alert.alert('Map', e?.message || 'Could not save selected location.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header
        title={editAddress ? 'Edit address' : 'Add on map'}
        onBack={() => navigation.goBack()}
      />
      <View style={styles.body}>
        <View style={styles.mapArea}>
          {!isWeb ? (
            <MapView
              style={StyleSheet.absoluteFill}
              initialRegion={{
                latitude: pin.lat,
                longitude: pin.lng,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              onPress={onMapPress}
            >
              <Marker
                coordinate={{ latitude: pin.lat, longitude: pin.lng }}
                draggable
                onDragEnd={onMapPress}
              />
            </MapView>
          ) : (
            <View style={styles.webMapFallback}>
              <Text style={styles.webMapTitle}>Location (web)</Text>
              <Text style={styles.mapSub}>
                Map pick is optimized for mobile. Enter latitude and longitude or use your current
                location, then save.
              </Text>
              <View style={styles.webCoordRow}>
                <TextInput
                  style={styles.webCoordInput}
                  value={String(pin.lat)}
                  onChangeText={(t) => {
                    const n = parseFloat(t);
                    if (!Number.isFinite(n)) return;
                    setPin((p) => ({ ...p, lat: n }));
                  }}
                  keyboardType="decimal-pad"
                  placeholder="Latitude"
                />
                <TextInput
                  style={styles.webCoordInput}
                  value={String(pin.lng)}
                  onChangeText={(t) => {
                    const n = parseFloat(t);
                    if (!Number.isFinite(n)) return;
                    setPin((p) => ({ ...p, lng: n }));
                  }}
                  keyboardType="decimal-pad"
                  placeholder="Longitude"
                />
              </View>
            </View>
          )}
          <View style={styles.mapPinHint}>
            <Text style={styles.mapSub}>
              {locating
                ? 'Locating...'
                : isWeb
                  ? 'Adjust coordinates or use device location'
                  : 'Tap or drag pin to select'}
            </Text>
          </View>
        </View>
        <View style={styles.info}>
          <Text style={styles.infoTitle}>Selected address</Text>
          <Text style={styles.infoSub}>{label}</Text>
          <Text style={styles.pin}>
            Pin: {pin.lat}, {pin.lng}
          </Text>
        </View>
        <View style={styles.typesRow}>
          {['Home', 'Office', 'Other'].map((type) => (
            <Button
              key={type}
              title={type}
              variant={addressType === type ? 'primary' : 'outline'}
              style={styles.typeBtn}
              onPress={() => setAddressType(type)}
            />
          ))}
        </View>
        <TextInput
          style={styles.input}
          placeholder="House / Flat / Floor"
          value={houseFlat}
          onChangeText={setHouseFlat}
        />
        <TextInput
          style={styles.input}
          placeholder="Landmark (optional)"
          value={landmark}
          onChangeText={setLandmark}
        />
        <View style={styles.metaRow}>
          <TextInput
            style={[styles.input, styles.metaInput]}
            placeholder="City"
            value={city}
            onChangeText={setCity}
          />
          <TextInput
            style={[styles.input, styles.metaInput]}
            placeholder="State"
            value={stateName}
            onChangeText={setStateName}
          />
        </View>
        <TextInput
          style={styles.input}
          placeholder="Pincode"
          value={pincode}
          onChangeText={setPincode}
          keyboardType="number-pad"
        />
        <Button
          title={editAddress ? 'Save changes' : manageOnly ? 'Save address' : 'Save address & continue'}
          onPress={onSave}
          loading={saving}
        />
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
    overflow: 'hidden',
    ...shadows.card,
  },
  webMapFallback: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
  },
  webMapTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  webCoordRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  webCoordInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    fontSize: 15,
  },
  mapPinHint: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    alignItems: 'center',
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
  typesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  typeBtn: {
    flex: 1,
    paddingHorizontal: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metaInput: {
    flex: 1,
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
