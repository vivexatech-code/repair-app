import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { confirmRsAppPayment } from '../services/bookingPaymentService';
import { showAppToast } from '../utils/appToast';

const theme = {
  primary: '#C45508',
  surface: '#FFFFFF',
  text: '#2c2f30',
  muted: '#595c5d',
  border: '#e0e3e4',
};

export function BookingPaymentRequestBanner({ booking, customerId, onPaid }) {
  const [busy, setBusy] = useState(false);
  const pr = booking?.paymentRequest;
  if (!pr || String(pr.status).toLowerCase() !== 'pending') return null;
  if (String(pr.method).toLowerCase() !== 'rs_app') return null;

  const amount = Number(pr.amount) || Number(booking?.totalAmount) || Number(booking?.amount) || 0;

  async function payNow() {
    if (!booking?.id || !customerId) return;
    setBusy(true);
    try {
      await confirmRsAppPayment({ bookingId: booking.id, customerId });
      showAppToast('Payment successful. Thank you!');
      onPaid?.();
    } catch (e) {
      showAppToast(e?.message || 'Payment failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <MaterialIcons name="payments" size={28} color={theme.primary} />
      <View style={styles.body}>
        <Text style={styles.title}>Payment requested</Text>
        <Text style={styles.sub}>
          Your partner sent a payment request for ₹{Math.round(amount)}. Pay securely in the app.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={() => void payNow()} disabled={busy}>
          {busy ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.btnText}>Pay now</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#FFF7ED',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  body: { flex: 1 },
  title: { fontSize: 16, fontWeight: '800', color: theme.text },
  sub: { fontSize: 13, color: theme.muted, marginTop: 4, lineHeight: 18 },
  btn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: theme.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
