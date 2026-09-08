import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Platform,
  StatusBar,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

import { doc, getDoc } from 'firebase/firestore';

import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useBookingFlow } from '../../context/BookingFlowContext';
import { useLocationContext } from '../../context/LocationContext';
import { db } from '../../services/firebase';
import { createBooking } from '../../services/bookingService';
import { fetchCheckoutQuote } from '../../services/checkoutCalculateService';
import { isSlotStillAvailable } from '../../services/bookingAllocationService';
import { isSlotPastForDate } from '../../constants/bookingSlots';
import { validateCoupon } from '../../services/couponService';
import { addressMapToString } from '../../utils/address';
import { getLineSubtotal, getPayableAmountsPerLine } from '../../utils/orderPricing';
import { SkeletonLoader } from '../../components/SkeletonLoader';
import {
  getLineDisplayTitle,
  getLineSelectedVariations,
  getLineSelectedSummaryText,
} from '../../utils/serviceVariations';

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

export function ConfirmScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  const navigation = useNavigation();

  const { user, customer } = useAuth();
  const {
    items,
    clearCart,
    appliedCoupon,
    setAppliedCoupon,
    servicesSubtotal,
    checkoutVisitingChargeTotal,
    checkoutOrderSubtotal,
    checkoutDiscountAmount,
    checkoutFinalTotal,
  } = useCart();
  const { address, scheduledAt, resetFlow, scheduledSlotMeta, revisitParent } =
    useBookingFlow();
  const { coords } = useLocationContext();

  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');

  const checkoutItems = useMemo(() => {
    if (revisitParent?.id) {
      return [
        {
          serviceId: revisitParent.serviceId,
          serviceName: revisitParent.serviceName,
          categoryId: revisitParent.categoryId,
          categoryName: revisitParent.categoryName,
          quantity: 1,
          duration: Number(revisitParent.durationMinutes) || 60,
          price: 0,
          amount: 0,
        },
      ];
    }
    return items;
  }, [revisitParent, items]);
  const isRevisitCheckout = Boolean(revisitParent?.id);

  const addressStr = addressMapToString(address);
  const scheduleLabel = scheduledAt
    ? scheduledAt.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Date & Time not selected';

  useEffect(() => {
    if (appliedCoupon?.code) {
      setPromoCode(String(appliedCoupon.code));
    }
  }, [appliedCoupon?.code]);

  const payablePreview = useMemo(
    () =>
      isRevisitCheckout
        ? [0]
        : getPayableAmountsPerLine(checkoutItems, checkoutDiscountAmount),
    [checkoutItems, checkoutDiscountAmount, isRevisitCheckout],
  );

  const onApplyPromo = async () => {
    if (!checkoutItems.length || isRevisitCheckout) return;
    setPromoError('');
    setPromoLoading(true);
    try {
      const result = await validateCoupon(promoCode, checkoutOrderSubtotal, {
        customerId: user?.uid,
        categoryIds: checkoutItems.map((l) => l.categoryId).filter(Boolean),
        serviceIds: checkoutItems.map((l) => l.serviceId).filter(Boolean),
      });
      if (!result.valid) {
        setAppliedCoupon(null);
        setPromoError(result.message);
        return;
      }
      setAppliedCoupon(result);
    } catch (e) {
      setAppliedCoupon(null);
      setPromoError(e?.message || 'Could not apply promo code.');
    } finally {
      setPromoLoading(false);
    }
  };

  const onRemovePromo = () => {
    setAppliedCoupon(null);
    setPromoCode('');
    setPromoError('');
  };

  const onConfirm = async () => {
    if (!user?.uid) return;
    if (!scheduledAt) {
      Alert.alert('Schedule Required', 'Please pick a date and time first.');
      return;
    }
    if (!scheduledSlotMeta?.slotDateStr) {
      Alert.alert('Schedule Required', 'Please choose a valid time slot.', [
        { text: 'OK', onPress: () => navigation.navigate('Schedule') },
      ]);
      return;
    }
    if (!checkoutItems.length) {
      Alert.alert('Empty Cart', 'Your cart is empty.');
      navigation.navigate('Cart');
      return;
    }

    const customerName = String(customer?.name ?? '').trim();
    const customerPhone = String(customer?.phone ?? '').trim();
    const customerEmailRaw = String(customer?.email ?? '').trim();
    if (!customerName || !customerPhone) {
      Alert.alert(
        'Profile incomplete',
        'Please add your name and phone in your account before booking.',
        [
          {
            text: 'OK',
            onPress: () =>
              navigation.navigate('MainTabs', { screen: 'Account' }),
          },
        ],
      );
      return;
    }

    setLoading(true);
    try {
      const addrPayload = {
        ...(address && typeof address === 'object' ? address : {}),
      };
      const lat =
        Number(addrPayload.lat) ||
        (coords?.latitude != null ? Number(coords.latitude) : NaN);
      const lng =
        Number(addrPayload.lng) ||
        (coords?.longitude != null ? Number(coords.longitude) : NaN);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        Alert.alert(
          'Location required',
          'Please set your service pin on the map so we can assign a nearby partner.',
          [{ text: 'OK', onPress: () => navigation.navigate('Address') }],
        );
        return;
      }

      const cat0 = String(checkoutItems[0]?.categoryId ?? '').trim();
      if (!cat0) {
        Alert.alert(
          'Missing category',
          'Please add items from a service category, then try again.',
        );
        return;
      }

      if (!scheduledAt || scheduledAt.getTime() <= Date.now()) {
        Alert.alert('Invalid time', 'Please choose a future time slot.', [
          { text: 'OK', onPress: () => navigation.navigate('Schedule') },
        ]);
        return;
      }

      if (
        scheduledSlotMeta?.slotDateStr &&
        scheduledSlotMeta?.slotIndex != null &&
        isSlotPastForDate(scheduledSlotMeta.slotDateStr, scheduledSlotMeta.slotIndex)
      ) {
        Alert.alert('Slot expired', 'This time slot has passed. Please pick another.', [
          { text: 'OK', onPress: () => navigation.navigate('Schedule') },
        ]);
        return;
      }

      const stillFree = await isSlotStillAvailable({
        categoryId: cat0,
        userLat: lat,
        userLng: lng,
        dateStr: scheduledSlotMeta.slotDateStr,
        slotIndex: scheduledSlotMeta.slotIndex,
      });
      if (!stillFree) {
        Alert.alert(
          'Slot unavailable',
          'This slot is no longer available. Please select another slot.',
          [{ text: 'OK', onPress: () => navigation.navigate('Schedule') }],
        );
        return;
      }

        const payables = isRevisitCheckout
          ? checkoutItems.map(() => 0)
          : getPayableAmountsPerLine(checkoutItems, checkoutDiscountAmount);
        const code = !isRevisitCheckout && appliedCoupon?.valid ? appliedCoupon.code : '';
        const couponMeta =
          !isRevisitCheckout && appliedCoupon?.valid && appliedCoupon?.id
            ? {
                id: appliedCoupon.id,
                collection: appliedCoupon.collection || 'coupons',
              }
            : null;

        let followupTechnicianId = isRevisitCheckout
          ? String(revisitParent?.technicianId || '').trim() || null
          : null;

        for (let idx = 0; idx < checkoutItems.length; idx++) {
          const line = checkoutItems[idx];
          const displayName = getLineDisplayTitle(line) || line.serviceName;
          const variationId = getLineSelectedVariations(line)?.[0]?.variationId
            || getLineSelectedVariations(line)?.[0]?.id;
          const quote = isRevisitCheckout
            ? null
            : await fetchCheckoutQuote({
                serviceId: line.serviceId,
                variationId,
                quantity: line.quantity || 1,
                couponCode: idx === 0 ? code : undefined,
              });
          const res = await createBooking({
            customerId: user.uid,
            customerName,
            customerPhone,
            ...(customerEmailRaw ? { customerEmail: customerEmailRaw } : {}),
            categoryId: line.categoryId,
            categoryName: line.categoryName,
            serviceId: line.serviceId,
            serviceName: displayName,
            amount: isRevisitCheckout
              ? 0
              : quote?.customer?.finalPayable ?? payables[idx],
            durationMinutes: (line.duration || 60) * (line.quantity || 1),
            visitingCharge: 0,
            servicePrice: isRevisitCheckout
              ? 0
              : quote?.customer?.serviceSubtotal ??
                (Number(line.price) || 0) * (Number(line.quantity) || 1),
            discountAmount: isRevisitCheckout
              ? 0
              : quote?.customer?.discount ??
                Math.max(0, getLineSubtotal(line) - payables[idx]),
            customerPlatformFeeType: quote?.settings?.customerPlatformFeeType,
            customerPlatformFeeValue: quote?.settings?.customerPlatformFeeValue,
            customerPlatformFee: quote?.customer?.platformFee,
            gstEnabled: quote?.settings?.gstEnabled,
            gstPercent: quote?.settings?.gstPercent,
            sparePartCommissionPercent: quote?.settings?.sparePartCommissionPercent,
            platformFeePercent: quote?.settings?.serviceCommissionPercent,
            addonFeePercent: quote?.settings?.additionalServiceCommissionPercent,
            address: addrPayload,
            scheduledAt,
            notes,
            promoCode: code || undefined,
          ...(idx === 0 && couponMeta ? { couponMeta } : {}),
          selectedVariations: getLineSelectedVariations(line),
          userLat: lat,
          userLng: lng,
          scheduledSlotDateStr: scheduledSlotMeta.slotDateStr,
          scheduledSlotLabel: scheduledSlotMeta.slotLabel,
          scheduledSlotIndex: scheduledSlotMeta.slotIndex,
          allocationRole:
            isRevisitCheckout || idx > 0 ? 'followup' : 'primary',
          ...(followupTechnicianId ? { followupTechnicianId } : {}),
          ...(isRevisitCheckout
            ? {
                isRevisit: true,
                parentBookingId: revisitParent.id,
                revisitReason: 'Customer claimed free revisit',
              }
            : {}),
        });

        if (idx === 0 && !isRevisitCheckout) {
          const snap = await getDoc(doc(db, 'bookings', res.id));
          followupTechnicianId = snap.exists()
            ? String(snap.data()?.technicianId ?? '').trim() || null
            : null;
          if (checkoutItems.length > 1 && !followupTechnicianId) {
            throw new Error(
              'Could not assign a service partner. Please try again.',
            );
          }
        }
      }

      if (!isRevisitCheckout) clearCart();
      resetFlow();

      Alert.alert(
        isRevisitCheckout ? 'Revisit Booked' : 'Booking Confirmed',
        isRevisitCheckout
          ? 'Free revisit booked with your previous partner.'
          : 'Your service has been successfully booked.',
        [
          {
            text: 'View Bookings',
            onPress: () => navigation.navigate('MainTabs', { screen: 'Bookings' }),
          },
        ],
      );
    } catch (e) {
      Alert.alert(
        'Error',
        e?.message || 'Could not create booking. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.surface} />

      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          disabled={loading}
        >
          <MaterialIcons name="arrow-back" size={24} color={theme.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review & Confirm</Text>
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
          <Text style={styles.heroTitle}>Almost done!</Text>
          <Text style={styles.heroSubtitle}>
            Review pricing and confirm your booking.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Appointment Details</Text>

          <View style={styles.infoRow}>
            <View style={styles.iconWrapper}>
              <MaterialIcons name="event" size={20} color={theme.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Schedule</Text>
              <Text style={styles.infoValue}>{scheduleLabel}</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Schedule')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.iconWrapper}>
              <MaterialIcons name="location-on" size={20} color={theme.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Service Address</Text>
              <Text style={styles.infoValue}>{addressStr || 'No address selected'}</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Address')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Price breakdown</Text>

          <View style={styles.servicesList}>
            {checkoutItems.map((i, idx) => {
              const variationSummary = getLineSelectedSummaryText(i);
              return (
              <View key={i.lineId || i.serviceId || `line-${idx}`} style={styles.serviceItem}>
                <View style={styles.serviceItemLeft}>
                  <Text style={styles.serviceItemName}>
                    {getLineDisplayTitle(i)}
                  </Text>
                  <Text style={styles.serviceItemQty} numberOfLines={4}>
                    Qty: {i.quantity}
                    {variationSummary ? ` · ${variationSummary}` : ''}
                    {(Number(i.visitingCharge) || 0) > 0
                      ? ` · Visit ₹${Math.round(Number(i.visitingCharge))} (at checkout)`
                      : ''}
                  </Text>
                </View>
                <Text style={styles.serviceItemPrice}>₹{Math.round(payablePreview[idx] ?? 0)}</Text>
              </View>
            );})}
          </View>

          <View style={styles.miniDivider} />

          <View style={styles.breakRow}>
            <Text style={styles.breakLabel}>Service price</Text>
            <Text style={styles.breakValue}>₹{Math.round(servicesSubtotal)}</Text>
          </View>
          <View style={styles.breakRow}>
            <Text style={styles.breakLabel}>Visiting charge</Text>
            <Text style={styles.breakValue}>
              {checkoutVisitingChargeTotal > 0
                ? `₹${Math.round(checkoutVisitingChargeTotal)}`
                : '₹0'}
            </Text>
          </View>
          <View style={styles.breakRow}>
            <Text style={styles.breakLabelBold}>Subtotal</Text>
            <Text style={styles.breakValueBold}>₹{Math.round(checkoutOrderSubtotal)}</Text>
          </View>

          <View style={styles.promoBlock}>
            <Text style={styles.promoTitle}>Promo code</Text>
            <View style={styles.promoRow}>
              <TextInput
                style={styles.promoInput}
                placeholder="Enter code"
                placeholderTextColor={theme.outlineVariant}
                value={promoCode}
                editable={!loading}
                onChangeText={(t) => {
                  setPromoCode(t);
                  setPromoError('');
                  if (appliedCoupon) setAppliedCoupon(null);
                }}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={[styles.promoBtn, promoLoading && { opacity: 0.7 }]}
                onPress={onApplyPromo}
                disabled={loading || promoLoading}
              >
                {promoLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.promoBtnText}>Apply</Text>
                )}
              </TouchableOpacity>
            </View>
            {appliedCoupon?.valid && appliedCoupon?.code ? (
              <View style={styles.appliedRow}>
                <MaterialIcons name="local-offer" size={16} color={theme.success} />
                <Text style={styles.appliedText}>{appliedCoupon.code}</Text>
                <TouchableOpacity onPress={onRemovePromo} hitSlop={10}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {promoError ? <Text style={styles.promoErr}>{promoError}</Text> : null}
          </View>

          {checkoutDiscountAmount > 0 ? (
            <View style={styles.breakRow}>
              <Text style={[styles.breakLabel, { color: theme.success }]}>Discount</Text>
              <Text style={[styles.breakValue, { color: theme.success, fontWeight: '800' }]}>
                − ₹{Math.round(checkoutDiscountAmount)}
              </Text>
            </View>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.totalPayRow}>
            <View>
              <Text style={styles.totalPayLabel}>Total payable</Text>
              <Text style={styles.totalPayHint}>
                {isRevisitCheckout
                  ? 'Free revisit — no charges'
                  : 'Incl. all charges & offers'}
              </Text>
            </View>
            <Text style={styles.totalPayValue}>
              ₹{Math.round(isRevisitCheckout ? 0 : checkoutFinalTotal)}
            </Text>
          </View>
        </View>

        <View style={styles.notesContainer}>
          <Text style={styles.sectionTitle}>Additional Notes (Optional)</Text>
          <View style={styles.inputWrapper}>
            <MaterialIcons
              name="edit-note"
              size={20}
              color={theme.onSurfaceVariant}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.textInput}
              placeholder="E.g., Gate code, specific instructions..."
              placeholderTextColor={theme.outlineVariant}
              value={notes}
              onChangeText={setNotes}
              multiline
              textAlignVertical="top"
              editable={!loading}
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.checkoutBtnWrapper, loading && { opacity: 0.7 }]}
          onPress={onConfirm}
          disabled={loading}
        >
          <LinearGradient
            colors={[theme.primary, theme.primaryContainer]}
            style={styles.checkoutBtn}
          >
            {loading ? (
              <SkeletonLoader
                width={140}
                height={18}
                borderRadius={999}
                style={styles.confirmLoadingBar}
              />
            ) : (
              <>
                <Text style={styles.checkoutBtnText}>
                  {isRevisitCheckout
                    ? 'Confirm free revisit'
                    : `Confirm • ₹${Math.round(checkoutFinalTotal)}`}
                </Text>
                <MaterialIcons name="check-circle-outline" size={18} color="#ffffff" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

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
    paddingBottom: 140,
  },
  scrollContentTablet: {
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  heroSection: {
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.onSurface,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    color: theme.onSurfaceVariant,
    lineHeight: 22,
  },
  card: {
    backgroundColor: theme.surfaceLowest,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.surfaceHigh,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.onSurface,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: theme.surfaceHigh,
    marginVertical: 16,
  },
  miniDivider: {
    height: 1,
    backgroundColor: theme.surfaceHigh,
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(165, 53, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: theme.onSurfaceVariant,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.onSurface,
    lineHeight: 22,
  },
  editText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.primary,
    marginTop: 8,
  },
  servicesList: {
    gap: 12,
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  serviceItemLeft: {
    flex: 1,
    paddingRight: 16,
  },
  serviceItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.onSurface,
    marginBottom: 4,
  },
  serviceItemQty: {
    fontSize: 13,
    color: theme.onSurfaceVariant,
  },
  serviceItemPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.onSurface,
  },
  breakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  breakLabel: {
    fontSize: 14,
    color: theme.onSurfaceVariant,
  },
  breakLabelBold: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.onSurface,
  },
  breakValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.onSurface,
  },
  breakValueBold: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.onSurface,
  },
  promoBlock: {
    marginTop: 8,
    marginBottom: 12,
  },
  promoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.onSurface,
    marginBottom: 8,
  },
  promoRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  promoInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.surfaceHigh,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'web' ? 10 : 8,
    fontSize: 15,
    color: theme.onSurface,
    backgroundColor: theme.surfaceLowest,
  },
  promoBtn: {
    backgroundColor: theme.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  appliedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  appliedText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: theme.success,
  },
  removeText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.primary,
  },
  promoErr: {
    color: theme.error,
    fontSize: 13,
    marginTop: 6,
  },
  totalPayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalPayLabel: {
    fontSize: 17,
    fontWeight: '900',
    color: theme.onSurface,
  },
  totalPayHint: {
    fontSize: 12,
    color: theme.onSurfaceVariant,
    marginTop: 2,
  },
  totalPayValue: {
    fontSize: 26,
    fontWeight: '900',
    color: theme.primary,
  },
  notesContainer: {
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    backgroundColor: theme.surfaceLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.surfaceHigh,
    padding: 12,
  },
  inputIcon: {
    marginTop: 2,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    minHeight: 80,
    fontSize: 15,
    color: theme.onSurface,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.surfaceLowest,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    borderTopWidth: 1,
    borderTopColor: theme.surfaceHigh,
    elevation: 20,
  },
  checkoutBtnWrapper: {
    width: '100%',
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    borderRadius: 16,
  },
  checkoutBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmLoadingBar: {
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
});
