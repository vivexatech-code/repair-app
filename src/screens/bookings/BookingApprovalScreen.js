import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeBooking,
  resolveBookingAddOnApproval,
} from '../../services/bookingService';
import { getBookingBaseAmount, getBookingDisplayServiceName } from '../../utils/bookingDisplay';
import { formatInrWhole } from '../../utils/bookingEarnings';
import {
  hasPendingExtrasApproval,
  normalizeProposedAddOnServices,
  normalizeProposedAdditionalServices,
  sumProposedAddOnAmount,
  sumProposedAdditionalAmount,
  getProposedBookingTotalWithExtras,
} from '../../utils/bookingApproval';
import { ScreenContainer } from '../../components/ScreenContainer';

const theme = {
  primary: '#C45508',
  primarySoft: 'rgba(196, 85, 8, 0.12)',
  surface: '#f5f6f7',
  surfaceLowest: '#ffffff',
  surfaceLow: '#eff1f2',
  surfaceHigh: '#e0e3e4',
  surfaceVariant: '#dadddf',
  onSurface: '#2c2f30',
  onSurfaceVariant: '#595c5d',
  success: '#16a34a',
  error: '#b31b25',
};

export function BookingApprovalScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const bookingId =
    route?.params?.bookingId != null ? String(route.params.bookingId) : '';

  const [live, setLive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState(null);
  const intro = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(intro, {
      toValue: 1,
      duration: 380,
      useNativeDriver: true,
    }).start();
  }, [intro]);

  useEffect(() => {
    if (!bookingId) {
      setLive(null);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    const unsub = subscribeBooking(
      bookingId,
      (docSnapshot) => {
        setLive(docSnapshot);
        setLoading(false);
      },
      () => {
        setLive(null);
        setLoading(false);
      },
    );
    return unsub;
  }, [bookingId]);

  const booking = live;

  const baseAmount = useMemo(
    () => (booking ? getBookingBaseAmount(booking) : 0),
    [booking],
  );

  const proposedExtras = useMemo(
    () => (booking ? normalizeProposedAddOnServices(booking) : []),
    [booking],
  );
  const proposedAdditional = useMemo(
    () => (booking ? normalizeProposedAdditionalServices(booking) : []),
    [booking],
  );

  const extrasSum = useMemo(
    () => (booking ? sumProposedAddOnAmount(booking) : 0),
    [booking],
  );
  const additionalSum = useMemo(
    () => (booking ? sumProposedAdditionalAmount(booking) : 0),
    [booking],
  );

  const finalProposed = useMemo(() => {
    if (!booking) return null;
    return getProposedBookingTotalWithExtras(booking, baseAmount);
  }, [booking, baseAmount]);

  const originalServiceName = useMemo(() => {
    if (!booking) return getBookingDisplayServiceName(null);
    return getBookingDisplayServiceName(booking);
  }, [booking]);

  const isPending = Boolean(booking && hasPendingExtrasApproval(booking));
  const isEditMode = booking?.extrasApprovalRequest?.isEdit === true;

  const staleHandledRef = useRef(false);

  useEffect(() => {
    if (loading || !booking || isPending || staleHandledRef.current) return;
    staleHandledRef.current = true;
    Alert.alert(
      'Already updated',
      'This request has already been approved or declined.',
      [{ text: 'OK', onPress: () => navigation.goBack() }],
    );
  }, [loading, booking, isPending, navigation]);

  useEffect(() => {
    staleHandledRef.current = false;
  }, [bookingId]);

  const onResolve = useCallback(
    async (decision) => {
      if (!user?.uid || !bookingId || action) return;
      const title = decision === 'approved' ? 'Approve?' : 'Reject?';
      const msg =
        decision === 'approved'
          ? 'Your booking total will include these services.'
          : 'Your booking will stay at the current amount.';

      Alert.alert(title, msg, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: decision === 'approved' ? 'Approve' : 'Reject',
          style: decision === 'approved' ? 'default' : 'destructive',
          onPress: async () => {
            setAction(decision);
            try {
              await resolveBookingAddOnApproval({
                bookingId,
                customerId: user.uid,
                decision,
              });
              navigation.navigate('BookingDetails', { bookingId });
            } catch (e) {
              Alert.alert(
                'Could not save',
                e?.message ||
                  'The request may have already been reviewed. Please refresh.',
              );
            } finally {
              setAction(null);
            }
          },
        },
      ]);
    },
    [action, bookingId, navigation, user?.uid],
  );

  const busy = action != null;
  const hasAnyProposed = proposedExtras.length > 0 || proposedAdditional.length > 0;

  if (!bookingId) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.muted}>Invalid booking.</Text>
      </SafeAreaView>
    );
  }

  if (loading && !booking) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.centered}>
          <ActivityIndicator color={theme.primary} size="large" />
          <Text style={styles.loadingText}>Loading request…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color={theme.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Approval</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.muted}>Booking not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.surface} />
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={theme.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review update</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScreenContainer style={styles.body}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollInner}
        >
          <Animated.View style={{ opacity: intro }}>
            <View style={styles.heroIcon}>
              <MaterialIcons name="engineering" size={36} color={theme.primary} />
            </View>
            <Text style={styles.heroTitle}>
              {isEditMode ? 'Updated add-on request' : 'Booking update request'}
            </Text>
            <Text style={styles.heroSub}>
              {isEditMode
                ? 'Partner updated add-on services. Previous add-ons will be replaced if you approve.'
                : 'Partner requested additional work or services. Review the breakdown below.'}
            </Text>

            <Text style={styles.sectionLabel}>Original service</Text>
            <View style={styles.card}>
              <Text style={styles.serviceTitle} numberOfLines={3}>
                {originalServiceName}
              </Text>
              <Text style={styles.caption}>Original booking</Text>
              <Text style={styles.amountMain}>{formatInrWhole(baseAmount)}</Text>
            </View>

            <Text style={styles.sectionLabel}>Extra services</Text>
            <View style={styles.card}>
              {proposedExtras.length === 0 ? (
                <Text style={styles.muted}>None proposed</Text>
              ) : (
                proposedExtras.map((row, idx) => (
                  <View
                    key={`e-${row.serviceId ?? row.serviceName}-${idx}`}
                    style={[styles.lineRow, idx > 0 && styles.lineRowBorder]}
                  >
                    <Text style={styles.lineTitle} numberOfLines={3}>
                      {row.serviceName}
                    </Text>
                    <Text style={styles.linePrice}>{formatInrWhole(row.price)}</Text>
                  </View>
                ))
              )}
            </View>

            <Text style={styles.sectionLabel}>Additional services</Text>
            <View style={styles.card}>
              {proposedAdditional.length === 0 ? (
                <Text style={styles.muted}>None proposed</Text>
              ) : (
                proposedAdditional.map((row, idx) => (
                  <View
                    key={`a-${row.serviceId ?? row.serviceName}-${idx}`}
                    style={[styles.lineRow, idx > 0 && styles.lineRowBorder]}
                  >
                    <Text style={styles.lineTitle} numberOfLines={3}>
                      {row.serviceName}
                    </Text>
                    <Text style={styles.linePrice}>{formatInrWhole(row.price)}</Text>
                  </View>
                ))
              )}
            </View>

            <Text style={styles.sectionLabel}>Totals</Text>
            <View style={styles.breakdown}>
              <View style={styles.breakRow}>
                <Text style={styles.breakLabel}>Original booking</Text>
                <Text style={styles.breakVal}>{formatInrWhole(baseAmount)}</Text>
              </View>
              <View style={styles.breakRow}>
                <Text style={styles.breakLabel}>Extra services</Text>
                <Text style={styles.breakVal}>{formatInrWhole(extrasSum)}</Text>
              </View>
              <View style={styles.breakRow}>
                <Text style={styles.breakLabel}>Additional services</Text>
                <Text style={styles.breakVal}>{formatInrWhole(additionalSum)}</Text>
              </View>
              <View style={[styles.breakRow, styles.breakFinalRow]}>
                <Text style={styles.finalLabel}>Final total</Text>
                <Text style={styles.finalValue}>
                  {finalProposed != null
                    ? formatInrWhole(finalProposed)
                    : formatInrWhole(baseAmount + extrasSum + additionalSum)}
                </Text>
              </View>
            </View>
          </Animated.View>

          {!isPending ? (
            <View style={styles.resolvedBanner}>
              <MaterialIcons name="info-outline" size={20} color={theme.onSurfaceVariant} />
              <Text style={styles.resolvedText}>
                This booking no longer has a pending request.
              </Text>
            </View>
          ) : (
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.btnApprove, (busy || !hasAnyProposed) && styles.btnDisabled]}
                disabled={busy || !hasAnyProposed}
                onPress={() => onResolve('approved')}
              >
                {busy && action === 'approved' ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="check-circle" size={22} color="#fff" />
                    <Text style={styles.btnApproveText}>Approve</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnReject, busy && styles.btnDisabled]}
                disabled={busy}
                onPress={() => onResolve('rejected')}
              >
                {busy && action === 'rejected' ? (
                  <ActivityIndicator color={theme.error} />
                ) : (
                  <>
                    <MaterialIcons name="cancel" size={22} color={theme.error} />
                    <Text style={styles.btnRejectText}>Reject</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </ScreenContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
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
    backgroundColor: theme.surfaceLowest,
    borderBottomWidth: 1,
    borderBottomColor: theme.surfaceHigh,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: theme.surface,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.onSurface,
  },
  headerSpacer: { width: 40 },
  body: { flex: 1 },
  scrollInner: {
    padding: 20,
    paddingBottom: 48,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  loadingText: { marginTop: 8, color: theme.onSurfaceVariant, fontWeight: '600' },
  muted: { fontSize: 15, color: theme.onSurfaceVariant, textAlign: 'center' },
  heroIcon: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: theme.onSurface,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  heroSub: {
    fontSize: 15,
    color: theme.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 26,
    paddingHorizontal: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: theme.onSurfaceVariant,
    letterSpacing: 1.2,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: theme.surfaceLowest,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.surfaceHigh,
    marginBottom: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 3,
  },
  serviceTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.onSurface,
    marginBottom: 6,
    lineHeight: 26,
  },
  caption: { fontSize: 13, color: theme.onSurfaceVariant, fontWeight: '600' },
  amountMain: {
    marginTop: 10,
    fontSize: 22,
    fontWeight: '900',
    color: theme.primary,
  },
  lineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
  },
  lineRowBorder: {
    borderTopWidth: 1,
    borderTopColor: theme.surfaceHigh,
  },
  lineTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: theme.onSurface,
  },
  linePrice: {
    fontSize: 17,
    fontWeight: '900',
    color: theme.onSurface,
  },
  breakdown: {
    borderRadius: 18,
    backgroundColor: theme.surfaceLowest,
    borderWidth: 1,
    borderColor: theme.surfaceHigh,
    padding: 18,
    marginBottom: 12,
  },
  breakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  breakFinalRow: {
    paddingTop: 14,
    marginTop: 4,
    marginBottom: 0,
    borderTopWidth: 1,
    borderTopColor: theme.surfaceVariant,
  },
  breakLabel: { fontSize: 15, color: theme.onSurfaceVariant, fontWeight: '600' },
  breakVal: { fontSize: 17, fontWeight: '700', color: theme.onSurface },
  finalLabel: { fontSize: 17, fontWeight: '900', color: theme.onSurface },
  finalValue: { fontSize: 24, fontWeight: '900', color: theme.primary },
  resolvedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: theme.surfaceLow,
    borderRadius: 14,
    marginBottom: 16,
  },
  resolvedText: { flex: 1, fontSize: 14, color: theme.onSurfaceVariant, fontWeight: '600' },
  actions: { gap: 12, marginTop: 8 },
  btnApprove: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: theme.success,
    paddingVertical: 16,
    borderRadius: 16,
  },
  btnApproveText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#fff',
  },
  btnReject: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(179, 27, 37, 0.35)',
    backgroundColor: theme.surfaceLowest,
  },
  btnRejectText: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.error,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
