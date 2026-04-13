import React from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Header } from '../../components/Header';
import { AddressCard } from '../../components/AddressCard';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { useBookingFlow } from '../../context/BookingFlowContext';
import { saveLastUsedAddress } from '../../services/customerService';
import { useAuth } from '../../context/AuthContext';

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

export function AddressListScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { setAddress } = useBookingFlow();
  const addresses = route.params?.addresses || [];
  const selectedId = route.params?.selectedId || null;

  const onSelect = async (item) => {
    const mapped = mapAddressObjectToBookingAddress(item);
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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="Saved Addresses" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body}>
        {addresses.map((item) => (
          <AddressCard
            key={item.id}
            highlighted={selectedId === item.id}
            icon={item.type === 'Work' ? 'business-outline' : 'home-outline'}
            title={item.type || 'Home'}
            subtitle={item.fullAddress}
            onPress={() => onSelect(item)}
          />
        ))}
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
});
