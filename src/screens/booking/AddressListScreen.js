import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { AddressCard } from '../../components/AddressCard';
import { Button } from '../../components/Button';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { useBookingFlow } from '../../context/BookingFlowContext';
import {
  saveCustomerAddresses,
  saveLastUsedAddress,
  subscribeCustomerProfile,
} from '../../services/customerService';
import { useAuth } from '../../context/AuthContext';
import {
  normalizeSavedAddress,
  savedAddressToBookingAddress,
} from '../../utils/address';

export function AddressListScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { setAddress } = useBookingFlow();
  const manageOnly = Boolean(route.params?.manageOnly);
  const selectedId = route.params?.selectedId || null;
  const paramAddresses = route.params?.addresses;

  const [addresses, setAddresses] = useState(() =>
    Array.isArray(paramAddresses)
      ? paramAddresses.map((a, i) => normalizeSavedAddress(a, `addr_${i}`)).filter(Boolean)
      : [],
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.uid) return undefined;
    const unsub = subscribeCustomerProfile(
      user.uid,
      (data) => {
        const list = Array.isArray(data?.addresses) ? data.addresses : [];
        setAddresses(list.map((a, i) => normalizeSavedAddress(a, `addr_${i}`)).filter(Boolean));
      },
      () => {},
    );
    return unsub;
  }, [user?.uid]);

  const subtitle = useMemo(
    () =>
      manageOnly
        ? 'Add, edit, or remove saved locations'
        : 'Tap an address to continue booking',
    [manageOnly],
  );

  const persist = async (next) => {
    if (!user?.uid) return;
    setSaving(true);
    try {
      await saveCustomerAddresses(user.uid, next);
      setAddresses(next);
    } catch (e) {
      Alert.alert('Address', e?.message || 'Could not update addresses.');
    } finally {
      setSaving(false);
    }
  };

  const onSelect = async (item) => {
    if (manageOnly) return;
    const mapped = savedAddressToBookingAddress(item);
    if (!mapped) {
      Alert.alert('Address', 'Invalid address selection.');
      return;
    }
    setAddress(mapped);
    if (user?.uid) {
      await saveLastUsedAddress(user.uid, item);
    }
    navigation.navigate('Schedule');
  };

  const onDelete = (item) => {
    Alert.alert('Delete address', 'Remove this saved address?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const next = addresses.filter((a) => a.id !== item.id);
          await persist(next);
        },
      },
    ]);
  };

  const onEdit = (item) => {
    navigation.navigate('MapPicker', {
      editAddress: item,
      manageOnly,
    });
  };

  const onAdd = () => {
    navigation.navigate('MapPicker', {
      existingCount: addresses.length,
      manageOnly,
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="Saved Addresses" onBack={() => navigation.goBack()} />
      <Text style={styles.sub}>{subtitle}</Text>
      <ScrollView contentContainerStyle={styles.body}>
        {addresses.length === 0 ? (
          <View style={styles.empty}>
            <MaterialIcons name="location-off" size={36} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No saved addresses</Text>
            <Text style={styles.emptySub}>Add one from the map to use it later.</Text>
          </View>
        ) : (
          addresses.map((item) => (
            <View key={item.id} style={styles.cardWrap}>
              <AddressCard
                highlighted={selectedId === item.id}
                icon={item.type === 'Work' || item.type === 'Office' ? 'business-outline' : 'home-outline'}
                title={item.type || 'Home'}
                subtitle={[item.fullAddress, item.city, item.state, item.pincode]
                  .filter(Boolean)
                  .join(', ')}
                onPress={() => onSelect(item)}
              />
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => onEdit(item)}
                  disabled={saving}
                >
                  <MaterialIcons name="edit" size={18} color={colors.primary} />
                  <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => onDelete(item)}
                  disabled={saving}
                >
                  <MaterialIcons name="delete-outline" size={18} color="#b31b25" />
                  <Text style={[styles.actionText, { color: '#b31b25' }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
        <Button
          title="Add new address"
          onPress={onAdd}
          style={styles.addBtn}
          disabled={saving}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  sub: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    color: colors.textSecondary,
    fontSize: 13,
  },
  body: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  emptySub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  cardWrap: {
    marginBottom: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    paddingHorizontal: 4,
    marginTop: -4,
    marginBottom: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  addBtn: {
    marginTop: spacing.md,
  },
});
