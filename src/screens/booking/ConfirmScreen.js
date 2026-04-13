import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Header } from '../../components/Header';
import { Button } from '../../components/Button';
import { InputField } from '../../components/InputField';
import { colors } from '../../constants/colors';
import { spacing, radius, shadows } from '../../constants/spacing';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useBookingFlow } from '../../context/BookingFlowContext';
import { createBooking } from '../../services/bookingService';
import { addressMapToString } from '../../utils/address';

export function ConfirmScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { items, subtotal, clearCart } = useCart();
  const { address, scheduledAt, resetFlow } = useBookingFlow();
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const addressStr = addressMapToString(address);
  const scheduleLabel = scheduledAt
    ? scheduledAt.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';

  const onConfirm = async () => {
    if (!user?.uid) return;
    if (!scheduledAt) {
      Alert.alert('Schedule', 'Pick a date and time first.');
      return;
    }
    if (!items.length) {
      Alert.alert('Cart', 'Your cart is empty.');
      navigation.navigate('Cart');
      return;
    }
    setLoading(true);
    try {
      const addrPayload = { ...address };
      for (const line of items) {
        await createBooking({
          customerId: user.uid,
          serviceId: line.serviceId,
          serviceName: line.name,
          amount: line.price * line.quantity,
          durationMinutes: line.duration * line.quantity,
          address: addrPayload,
          scheduledAt,
          notes,
        });
      }
      clearCart();
      resetFlow();
      Alert.alert('Booked', 'Your booking was created.', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('MainTabs', { screen: 'Bookings' }),
        },
      ]);
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not create booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="Confirm" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Address</Text>
          <Text style={styles.cardBody}>{addressStr || '—'}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Schedule</Text>
          <Text style={styles.cardBody}>{scheduleLabel}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Services</Text>
          {items.map((i) => (
            <Text key={i.serviceId} style={styles.line}>
              {i.name} × {i.quantity} — ₹{i.price * i.quantity}
            </Text>
          ))}
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Total</Text>
          <Text style={styles.total}>₹{subtotal}</Text>
        </View>
        <InputField
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          multiline
        />
        <Button title="Confirm booking" onPress={onConfirm} loading={loading} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  cardBody: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  line: {
    fontSize: 15,
    color: colors.text,
    marginBottom: 4,
  },
  total: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
  },
});
