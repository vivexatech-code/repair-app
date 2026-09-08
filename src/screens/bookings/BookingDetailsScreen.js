import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  useWindowDimensions,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { addressMapToString } from '../../utils/address';
import { useBookings } from '../../context/BookingsContext';
import { useAuth } from '../../context/AuthContext';
import { BOOKING_STATUS } from '../../constants';
import {
  getCompletedServiceDurationLabel,
  normalizeAddOnServices,
  getBookingBaseAmount,
  getBookingFinalTotal,
  getBookingDisplayServiceName,
  getBookingDisplayCategoryName,
  getBookingDisplayCustomerName,
  getBookingDisplayCustomerPhone,
  getBookingDisplayCustomerEmail,
} from '../../utils/bookingDisplay';
import { getFrozenBookingEconomics, formatInrWhole } from '../../utils/bookingEarnings';
import {
  hasPendingCustomerApproval,
  countPendingProposedLines,
  extrasApprovalWasRejected,
} from '../../utils/bookingApproval';
import { getTechnicianPhoneById } from '../../services/technicianService';
import {
  cancelBookingByUser,
  subscribeBooking,
  submitCustomerRating,
} from '../../services/bookingService';
import { fetchServiceById } from '../../services/serviceCatalogService';
import { getGoogleReviewUrl } from '../../services/generalSettingsService';
import { generateBookingInvoice } from '../../services/bookingInvoiceService';
import { openPhoneDialer } from '../../utils/phoneDial';
import { ScreenContainer } from '../../components/ScreenContainer';
import { BookingPaymentRequestBanner } from '../../components/BookingPaymentRequestBanner';
import { BookingStatusTimeline } from '../../components/BookingStatusTimeline';
import { useBookingFlow } from '../../context/BookingFlowContext';
import { showAppToast } from '../../utils/appToast';
import {
  canClaimRevisit,
  getBookingTechnicianId,
  getRevisitRemaining,
} from '../../utils/revisitEligibility';

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

// Helper for dynamic status colors
const getStatusStyles = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'completed') return { bg: '#dcfce7', text: '#166534', dot: '#16a34a' };
  if (s === 'cancelled') return { bg: '#fee2e2', text: '#991b1b', dot: '#dc2626' };
  if (s === 'inprogress') return { bg: '#dbeafe', text: '#1e40af', dot: '#2563eb' };
  // Default for New/Assigned/Upcoming
  return { bg: 'rgba(165, 53, 0, 0.1)', text: theme.primary, dot: theme.primary };
};

function canUserCancelBookingStatus(status) {
  const s = String(status ?? '').trim().toLowerCase();
  return (
    s === String(BOOKING_STATUS.NEW).toLowerCase() ||
    s === String(BOOKING_STATUS.ASSIGNED).toLowerCase() ||
    s === 'pending'
  );
}

export function BookingDetailsScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  const navigation = useNavigation();
  const route = useRoute();
  const [resolvedPhone, setResolvedPhone] = useState(null);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [liveBooking, setLiveBooking] = useState(null);
  const [googleReviewUrl, setGoogleReviewUrl] = useState('');
  const [serviceRevisitPolicy, setServiceRevisitPolicy] = useState(null);
  const [ratingBusy, setRatingBusy] = useState(false);
  const [invoiceBusy, setInvoiceBusy] = useState(false);

  const bookingId =
    route?.params?.bookingId != null ? String(route.params.bookingId) : '';
  const { bookings } = useBookings();
  const { user } = useAuth();
  const { setAddress, setRevisitParent, resetFlow } = useBookingFlow();
  const bookingsList = Array.isArray(bookings) ? bookings : [];

  const contextBooking = useMemo(
    () => bookingsList.find((b) => String(b?.id ?? '') === bookingId),
    [bookingsList, bookingId],
  );

  const booking = useMemo(
    () => liveBooking ?? contextBooking,
    [liveBooking, contextBooking],
  );

  useEffect(() => {
    if (!bookingId) {
      setLiveBooking(null);
      return undefined;
    }
    setLiveBooking(null);
    const unsub = subscribeBooking(
      bookingId,
      (doc) => setLiveBooking(doc),
      () => {
        /* Firestore error: keep contextBooking as fallback */
      },
    );
    return unsub;
  }, [bookingId]);

  useEffect(() => {
    let cancelled = false;
    getGoogleReviewUrl().then((url) => {
      if (!cancelled) setGoogleReviewUrl(url);
    });
    return () => { cancelled = true; };
  }, []);

  // Live service policy fallback — unlocks claim when booking snapshot is missing.
  useEffect(() => {
    let cancelled = false;
    const serviceId = booking?.serviceId != null ? String(booking.serviceId).trim() : '';
    if (!serviceId || booking?.revisitPolicy?.enabled === true) {
      setServiceRevisitPolicy(null);
      return undefined;
    }
    fetchServiceById(serviceId)
      .then((svc) => {
        if (cancelled) return;
        setServiceRevisitPolicy(svc?.revisitPolicy || null);
      })
      .catch(() => {
        if (!cancelled) setServiceRevisitPolicy(null);
      });
    return () => {
      cancelled = true;
    };
  }, [booking?.serviceId, booking?.revisitPolicy?.enabled]);

  const addOnServices = useMemo(
    () => normalizeAddOnServices(booking),
    [booking],
  );
  const baseAmount = useMemo(() => getBookingBaseAmount(booking), [booking]);
  const finalTotal = useMemo(
    () => getBookingFinalTotal(booking, addOnServices, baseAmount),
    [booking, addOnServices, baseAmount],
  );

  const frozenEconomics = useMemo(() => {
    if (!booking || booking.status !== BOOKING_STATUS.COMPLETED) return null;
    return getFrozenBookingEconomics(booking);
  }, [booking]);

  const needsApproval = Boolean(booking && hasPendingCustomerApproval(booking));
  const pendingPreviewCount = useMemo(
    () => (booking ? countPendingProposedLines(booking) : 0),
    [booking],
  );

  const lastApprovalRejected = useMemo(
    () => Boolean(booking && extrasApprovalWasRejected(booking)),
    [booking],
  );

  const approvedExtraRows = useMemo(
    () => addOnServices.filter((r) => r.serviceType === 'extra'),
    [addOnServices],
  );
  const approvedAdditionalRows = useMemo(
    () => addOnServices.filter((r) => r.serviceType === 'additional'),
    [addOnServices],
  );
  const legacyAddOnRows = useMemo(
    () => addOnServices.filter((r) => !r.serviceType),
    [addOnServices],
  );

  useEffect(() => {
    let cancelled = false;
    if (!booking) {
      setResolvedPhone(null);
      setPhoneLoading(false);
      return undefined;
    }
    const inline =
      booking.technicianPhone ||
      booking.technician?.phone ||
      booking.technician?.mobile;
    if (inline != null && String(inline).trim() !== '') {
      setResolvedPhone(String(inline).trim());
      setPhoneLoading(false);
      return undefined;
    }
    if (!booking.technicianId) {
      setResolvedPhone(null);
      setPhoneLoading(false);
      return undefined;
    }
    setPhoneLoading(true);
    getTechnicianPhoneById(booking.technicianId)
      .then((p) => {
        if (!cancelled) {
          setResolvedPhone(p);
          setPhoneLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedPhone(null);
          setPhoneLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [booking]);

  const onCallTechnician = useCallback(async () => {
    if (phoneLoading) return;
    const r = await openPhoneDialer(resolvedPhone);
    if (!r?.ok) {
      Alert.alert(
        'Call unavailable',
        'Phone number is not available for this partner yet.',
      );
    }
  }, [resolvedPhone, phoneLoading]);

  const canCancelBooking =
    Boolean(booking?.id) &&
    !cancelling &&
    canUserCancelBookingStatus(booking?.status);

  const canRescheduleBooking =
    Boolean(booking?.id) &&
    (booking?.status === BOOKING_STATUS.NEW ||
      booking?.status === BOOKING_STATUS.ASSIGNED ||
      String(booking?.status || '').toLowerCase() === 'pending');

  const onRescheduleBooking = useCallback(() => {
    if (!booking?.id || !canRescheduleBooking) return;
    const addr =
      booking.address && typeof booking.address === 'object' ? booking.address : {};
    const lat = Number(addr.lat ?? addr.latitude);
    const lng = Number(addr.lng ?? addr.longitude);
    navigation.navigate('Schedule', {
      reschedule: {
        bookingId: booking.id,
        categoryId: booking.categoryId || booking.serviceCategoryId || '',
        lat: Number.isFinite(lat) ? lat : undefined,
        lng: Number.isFinite(lng) ? lng : undefined,
      },
    });
  }, [booking, canRescheduleBooking, navigation]);

  const invoiceUrl = useMemo(() => {
    if (!booking) return '';
    const candidates = [
      booking.invoiceUrl,
      booking.invoicePDF,
      booking.invoicePdfUrl,
      booking.invoice?.url,
      booking.invoice?.pdfUrl,
    ];
    for (const c of candidates) {
      const s = String(c || '').trim();
      if (s.startsWith('http')) return s;
    }
    return '';
  }, [booking]);

  const onRateBooking = useCallback(
    async (stars) => {
      if (!booking?.id || ratingBusy || booking.customerRating != null) return;
      setRatingBusy(true);
      try {
        await submitCustomerRating(booking.id, stars);
        showAppToast('Thanks for your rating!');
      } catch (e) {
        Alert.alert('Rating', e?.message || 'Could not save rating.');
      } finally {
        setRatingBusy(false);
      }
    },
    [booking?.id, booking?.customerRating, ratingBusy],
  );

  const onOpenOrShareInvoice = useCallback(async () => {
    if (!booking?.id || invoiceBusy) return;
    setInvoiceBusy(true);
    try {
      let url = invoiceUrl;
      const needsFreshLink = !url || !/res\.cloudinary\.com/i.test(url);
      if (needsFreshLink) {
        const result = await generateBookingInvoice({
          bookingId: booking.id,
          force: false,
          sendEmail: true,
        });
        url = String(result?.pdfUrl || url || '').trim();
      }
      if (!url) {
        throw new Error('Invoice PDF was not created');
      }
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert('Invoice', e?.message || 'Could not generate invoice PDF.');
    } finally {
      setInvoiceBusy(false);
    }
  }, [booking?.id, invoiceBusy, invoiceUrl]);

  const onCancelBooking = useCallback(() => {
    if (!booking?.id || cancelling || !canUserCancelBookingStatus(booking?.status)) {
      return;
    }
    Alert.alert(
      'Cancel booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, cancel',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await cancelBookingByUser(booking.id);
            } catch (e) {
              Alert.alert(
                'Could not cancel',
                e?.message || 'Please try again.',
              );
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  }, [booking?.id, booking?.status, cancelling]);

  const scheduled = booking?.scheduledAt?.toDate
    ? (() => {
        try {
          return booking.scheduledAt.toDate().toLocaleString([], {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
        } catch {
          return 'Date pending';
        }
      })()
    : 'Date pending';

  const addressStr = booking?.address
    ? addressMapToString(booking.address)
    : 'No address provided';

  const statusStyle = getStatusStyles(booking?.status);

  const serviceTitle = getBookingDisplayServiceName(booking);
  const categoryTitle = getBookingDisplayCategoryName(booking);
  const snapshotCustomerName = getBookingDisplayCustomerName(booking);
  const snapshotCustomerPhone = getBookingDisplayCustomerPhone(booking);
  const snapshotCustomerEmail = getBookingDisplayCustomerEmail(booking);

  const completedDurationLabel =
    booking?.status === BOOKING_STATUS.COMPLETED
      ? getCompletedServiceDurationLabel(booking)
      : null;

  const showOtp =
    booking?.status === BOOKING_STATUS.ASSIGNED &&
    booking?.otp != null &&
    String(booking.otp).trim() !== '';

  const effectiveRevisitPolicy = booking?.revisitPolicy || serviceRevisitPolicy || null;
  const revisitLeft = booking ? getRevisitRemaining(booking, effectiveRevisitPolicy) : 0;
  const canClaimFreeRevisit = booking
    ? canClaimRevisit(booking, effectiveRevisitPolicy)
    : false;

  const onClaimRevisit = useCallback(() => {
    if (!booking || !canClaimFreeRevisit) return;
    if (!user?.uid) {
      Alert.alert('Login required', 'Please sign in to claim a revisit.');
      return;
    }
    resetFlow();
    const addr = booking.address && typeof booking.address === 'object' ? booking.address : {};
    setAddress({
      line1: addr.line1 || addr.street || addr.fullAddress || addressMapToString(addr) || '',
      line2: addr.line2 || addr.area || '',
      city: addr.city || '',
      state: addr.state || '',
      pincode: addr.pincode || addr.postalCode || '',
      lat: addr.lat ?? addr.latitude,
      lng: addr.lng ?? addr.longitude,
      fullAddress: addressMapToString(addr),
    });
    setRevisitParent({
      id: booking.id,
      serviceId: booking.serviceId,
      serviceName: booking.serviceName,
      categoryId: booking.categoryId,
      categoryName: booking.categoryName,
      technicianId: getBookingTechnicianId(booking),
      durationMinutes: booking.durationMinutes || 60,
      revisitPolicy: effectiveRevisitPolicy,
    });
    navigation.navigate('Schedule');
  }, [
    booking,
    canClaimFreeRevisit,
    user?.uid,
    resetFlow,
    setAddress,
    setRevisitParent,
    navigation,
    effectiveRevisitPolicy,
  ]);

  if (!booking) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color={theme.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyContainer}>
          <MaterialIcons name="hourglass-empty" size={48} color={theme.surfaceHigh} />
          <Text style={styles.mutedText}>Booking not found or loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.surface} />

      {/* Inline Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={theme.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Summary</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScreenContainer style={styles.screenBody}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            isTablet && styles.scrollContentTablet,
          ]}
        >
        {/* Hero Card: Core Service Info */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View>
              <Text style={styles.bookingCodeLabel}>BOOKING ID</Text>
              <Text style={styles.bookingCode}>
                {booking?.bookingCode
                  ? String(booking.bookingCode)
                  : booking?.id
                    ? `#${String(booking.id).slice(0, 8)}`
                    : '#—'}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: statusStyle.dot }]} />
              <Text style={[styles.statusText, { color: statusStyle.text }]}>
                {booking?.status != null && String(booking.status).trim() !== ''
                  ? String(booking.status)
                  : '—'}
              </Text>
            </View>
          </View>

          {needsApproval ? (
            <TouchableOpacity
              style={styles.approvalBanner}
              activeOpacity={0.88}
              onPress={() =>
                navigation.navigate('BookingApproval', { bookingId: booking.id })
              }
              accessibilityRole="button"
              accessibilityLabel="Review booking update request"
            >
              <View style={styles.approvalBannerIcon}>
                <MaterialIcons name="rate-review" size={22} color={theme.primary} />
              </View>
              <View style={styles.approvalBannerTextCol}>
                <Text style={styles.approvalBannerTitle}>Booking update request</Text>
                <Text style={styles.approvalBannerBody}>
                  Partner requested additional work or services.
                  {pendingPreviewCount > 0
                    ? ` ${pendingPreviewCount} line item${pendingPreviewCount === 1 ? '' : 's'} to review. `
                    : ' '}
                  Your total will not change until you approve.
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={theme.primary} />
            </TouchableOpacity>
          ) : null}

          <BookingPaymentRequestBanner
            booking={booking}
            customerId={user?.uid}
          />

          <View style={styles.heroBody}>
            <Text style={styles.bookedServiceLabel}>Booked Service</Text>
            <Text style={styles.serviceName} numberOfLines={3} maxFontSizeMultiplier={1.35}>
              {serviceTitle}
            </Text>
            <Text style={styles.price} maxFontSizeMultiplier={1.35}>
              ₹{baseAmount}
            </Text>

            <View style={styles.snapshotBlock}>
              <Text style={styles.snapshotBlockTitle}>Service category</Text>
              <Text style={styles.snapshotBlockValue} numberOfLines={2}>
                {categoryTitle}
              </Text>
              <Text style={[styles.snapshotBlockTitle, styles.snapshotBlockTitleSpaced]}>
                Your contact (at booking time)
              </Text>
              <Text style={styles.snapshotBlockValue} numberOfLines={2}>
                {snapshotCustomerName}
              </Text>
              <Text style={styles.snapshotBlockMuted}>{snapshotCustomerPhone}</Text>
              {snapshotCustomerEmail ? (
                <Text style={styles.snapshotBlockMuted}>{snapshotCustomerEmail}</Text>
              ) : null}
            </View>
          </View>

          {approvedExtraRows.length > 0 ? (
            <View style={styles.addOnSection}>
              <View style={styles.addOnSectionTitleRow}>
                <MaterialIcons name="bolt" size={22} color={theme.primary} />
                <Text style={styles.addOnSectionTitle}>Approved extra services</Text>
              </View>
              <View style={styles.addOnListCard}>
                {approvedExtraRows.map((row, idx) => (
                  <View
                    key={`ex-${row.serviceName}-${idx}`}
                    style={[
                      styles.addOnRow,
                      idx < approvedExtraRows.length - 1 && styles.addOnRowBorder,
                    ]}
                  >
                    <View style={styles.addOnTextCol}>
                      <Text style={styles.addOnName} numberOfLines={2}>
                        {row.serviceName || 'Service'}
                      </Text>
                    </View>
                    <Text style={styles.addOnPrice}>₹{row.price}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {approvedAdditionalRows.length > 0 ? (
            <View style={styles.addOnSection}>
              <View style={styles.addOnSectionTitleRow}>
                <MaterialIcons name="add-circle-outline" size={22} color={theme.primary} />
                <Text style={styles.addOnSectionTitle}>Approved additional services</Text>
              </View>
              <View style={styles.addOnListCard}>
                {approvedAdditionalRows.map((row, idx) => (
                  <View
                    key={`ad-${row.serviceName}-${idx}`}
                    style={[
                      styles.addOnRow,
                      idx < approvedAdditionalRows.length - 1 && styles.addOnRowBorder,
                    ]}
                  >
                    <View style={styles.addOnTextCol}>
                      <Text style={styles.addOnName} numberOfLines={2}>
                        {row.serviceName || 'Service'}
                      </Text>
                    </View>
                    <Text style={styles.addOnPrice}>₹{row.price}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {legacyAddOnRows.length > 0 ? (
            <View style={styles.addOnSection}>
              <View style={styles.addOnSectionTitleRow}>
                <MaterialIcons name="playlist-add-check" size={22} color={theme.primary} />
                <Text style={styles.addOnSectionTitle}>Additional services</Text>
              </View>
              <View style={styles.addOnListCard}>
                {legacyAddOnRows.map((row, idx) => (
                  <View
                    key={`lg-${row.serviceName}-${idx}`}
                    style={[
                      styles.addOnRow,
                      idx < legacyAddOnRows.length - 1 && styles.addOnRowBorder,
                    ]}
                  >
                    <View style={styles.addOnTextCol}>
                      <Text style={styles.addOnName} numberOfLines={2}>
                        {row.serviceName || 'Service'}
                      </Text>
                    </View>
                    <Text style={styles.addOnPrice}>₹{row.price}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {addOnServices.length === 0 ? (
            <View style={styles.addOnSection}>
              <View style={styles.addOnSectionTitleRow}>
                <MaterialIcons name="add-circle-outline" size={22} color={theme.primary} />
                <Text style={styles.addOnSectionTitle}>Additional services</Text>
              </View>
              <View style={styles.addOnListCard}>
                <Text style={styles.addOnEmptyText}>No additional services yet</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.totalPayableCard}>
            <View style={styles.totalPayableRow}>
              <MaterialIcons name="payments" size={24} color={theme.surfaceLowest} />
              <View style={styles.totalPayableTextCol}>
                <Text style={styles.totalPayableLabel}>Total payable</Text>
                <Text style={styles.totalPayableHint}>
                  {needsApproval
                    ? 'Your current confirmed total. Pending items appear after approval.'
                    : 'Includes booked service and add-ons'}
                </Text>
              </View>
            </View>
            <Text style={styles.totalPayableAmount} maxFontSizeMultiplier={1.35}>
              ₹{finalTotal}
            </Text>
          </View>

          {frozenEconomics ? (
            <View style={styles.frozenEconomicsCard}>
              <Text style={styles.frozenEconomicsTitle}>Confirmed at completion</Text>
              <Text style={styles.frozenEconomicsHint}>
                These amounts are stored on your booking and do not change if platform rates are
                updated later.
              </Text>
              <View style={styles.frozenRow}>
                <Text style={styles.frozenLabel}>Original booking</Text>
                <Text style={styles.frozenValue}>
                  {formatInrWhole(frozenEconomics.originalBookingAmount)}
                </Text>
              </View>
              <View style={styles.frozenRow}>
                <Text style={styles.frozenLabel}>Additional services (total)</Text>
                <Text style={styles.frozenValue}>
                  {formatInrWhole(frozenEconomics.addedServicesAmount)}
                </Text>
              </View>
              <View style={[styles.frozenRow, styles.frozenRowLast]}>
                <Text style={styles.frozenLabel}>Total paid</Text>
                <Text style={styles.frozenValueHighlight}>
                  {formatInrWhole(frozenEconomics.finalBookingAmount)}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        {lastApprovalRejected ? (
          <View style={styles.rejectedNotice}>
            <MaterialIcons name="info-outline" size={20} color={theme.onSurfaceVariant} />
            <Text style={styles.rejectedNoticeText}>
              You declined the last proposed extras. Charges stayed at your previous total.
            </Text>
          </View>
        ) : null}

        <BookingStatusTimeline booking={booking} />

        {showOtp && (
          <View style={styles.otpBanner}>
            <MaterialIcons name="vpn-key" size={22} color={theme.primary} />
            <Text style={styles.otpBannerText}>
              Aapka OTP: {booking?.otp != null ? String(booking.otp) : ''}
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Appointment Details</Text>

        {/* Details Card */}
        <View style={styles.infoCard}>
          <InfoRow 
            icon="event" 
            label="Scheduled For" 
            value={scheduled} 
          />
          <View style={styles.divider} />
          <InfoRow 
            icon="schedule" 
            label="Est. Duration" 
            value={`${Number(booking?.durationMinutes) || 0} minutes`} 
          />
          {completedDurationLabel && (
            <>
              <View style={styles.divider} />
              <InfoRow
                icon="timer"
                label="Total Time"
                value={completedDurationLabel}
              />
            </>
          )}
          <View style={styles.divider} />
          <InfoRow 
            icon="location-on" 
            label="Service Address" 
            value={addressStr} 
          />
        </View>

        {/* Technician Card (If Assigned) */}
        {(booking?.technicianName || booking?.technicianId) && (
          <>
            <Text style={styles.sectionTitle}>Partner</Text>
            <View style={styles.infoCard}>
              <View style={styles.techRow}>
                <View style={styles.techAvatar}>
                  <MaterialIcons name="person" size={24} color={theme.primary} />
                </View>
                <View style={styles.techDetails}>
                  <Text style={styles.techName} numberOfLines={2}>
                    {booking?.technicianName || 'Assigned partner'}
                  </Text>
                  <Text style={styles.techSub}>Assigned Professional</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.iconButton,
                    (!resolvedPhone || phoneLoading) && styles.iconButtonDisabled,
                  ]}
                  onPress={onCallTechnician}
                  disabled={phoneLoading || !resolvedPhone}
                  accessibilityRole="button"
                  accessibilityLabel="Call partner"
                >
                  {phoneLoading ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : (
                    <MaterialIcons
                      name="phone"
                      size={20}
                      color={resolvedPhone ? theme.primary : theme.surfaceVariant}
                    />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {booking?.status === BOOKING_STATUS.COMPLETED ? (
          <View style={styles.reviewCard}>
            <MaterialIcons name="star" size={32} color="#F59E0B" />
            <Text style={styles.reviewTitle}>Rate Your Experience</Text>
            <Text style={styles.reviewSub}>
              {booking.customerRating != null
                ? `You rated this visit ${booking.customerRating}/5.`
                : 'Tap a star to rate this visit (saved on your booking).'}
            </Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => {
                const active = Number(booking.customerRating || 0) >= n;
                return (
                  <TouchableOpacity
                    key={n}
                    disabled={booking.customerRating != null || ratingBusy}
                    onPress={() => void onRateBooking(n)}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={`Rate ${n} stars`}
                  >
                    <MaterialIcons
                      name={active ? 'star' : 'star-border'}
                      size={32}
                      color="#F59E0B"
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
            {ratingBusy ? (
              <ActivityIndicator style={{ marginTop: 8 }} color={theme.primary} />
            ) : null}
            <TouchableOpacity
              style={[styles.reviewBtn, styles.invoiceBtn]}
              activeOpacity={0.85}
              onPress={() => void onOpenOrShareInvoice()}
              disabled={invoiceBusy}
            >
              {invoiceBusy ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <MaterialIcons name="picture-as-pdf" size={20} color="#fff" />
                  <Text style={styles.reviewBtnText}>
                    {invoiceUrl ? 'Open Invoice' : 'Download Invoice PDF'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            {googleReviewUrl ? (
              <TouchableOpacity
                style={[styles.reviewBtn, styles.googleReviewBtn]}
                activeOpacity={0.85}
                onPress={() => {
                  Linking.openURL(googleReviewUrl).catch(() => {
                    Alert.alert('Unable to open', 'Could not open Google review link.');
                  });
                }}
              >
                <MaterialIcons name="rate-review" size={20} color={theme.primary} />
                <Text style={[styles.reviewBtnText, { color: theme.primary }]}>
                  Leave Google Review
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {canClaimFreeRevisit ? (
          <View style={styles.reviewCard}>
            <MaterialIcons name="replay" size={32} color={theme.primary} />
            <Text style={styles.reviewTitle}>Free revisit available</Text>
            <Text style={styles.reviewSub}>
              Same partner will handle this revisit. Remaining: {revisitLeft}
            </Text>
            <TouchableOpacity
              style={styles.reviewBtn}
              activeOpacity={0.85}
              onPress={onClaimRevisit}
            >
              <MaterialIcons name="event-available" size={20} color="#fff" />
              <Text style={styles.reviewBtnText}>Claim Free Revisit</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Notes Card */}
        {booking?.notes ? (
          <>
            <Text style={styles.sectionTitle}>Additional Notes</Text>
            <View style={styles.infoCard}>
              <Text style={styles.notesText}>{String(booking.notes)}</Text>
            </View>
          </>
        ) : null}

        {canRescheduleBooking ? (
          <TouchableOpacity
            style={styles.rescheduleButton}
            activeOpacity={0.75}
            onPress={onRescheduleBooking}
            accessibilityRole="button"
            accessibilityLabel="Reschedule booking"
          >
            <MaterialIcons name="event" size={22} color={theme.primary} />
            <Text style={styles.rescheduleButtonText}>Reschedule Visit</Text>
          </TouchableOpacity>
        ) : null}

        {canCancelBooking && (
          <TouchableOpacity
            style={[styles.cancelButton, cancelling && styles.cancelButtonDisabled]}
            activeOpacity={0.75}
            onPress={onCancelBooking}
            disabled={cancelling}
            accessibilityRole="button"
            accessibilityLabel="Cancel booking"
          >
            {cancelling ? (
              <ActivityIndicator size="small" color={theme.error} />
            ) : (
              <MaterialIcons name="cancel" size={22} color={theme.error} />
            )}
            <Text style={styles.cancelButtonText}>Cancel Booking</Text>
          </TouchableOpacity>
        )}

        {/* Help Action */}
        <TouchableOpacity
          style={styles.helpButton}
          activeOpacity={0.7}
          onPress={() =>
            navigation.navigate('Support', {
              bookingId: booking?.id || bookingId || '',
            })
          }
          accessibilityRole="button"
          accessibilityLabel="Need help with this booking"
        >
          <MaterialIcons name="help-outline" size={20} color={theme.onSurfaceVariant} />
          <Text style={styles.helpButtonText}>Need help with this booking?</Text>
        </TouchableOpacity>

        </ScrollView>
      </ScreenContainer>
    </SafeAreaView>
  );
}

// --- Sub-Components ---

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIconWrapper}>
      <MaterialIcons name={icon} size={20} color={theme.onSurfaceVariant} />
    </View>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={8}>
        {value ?? '—'}
      </Text>
    </View>
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
  screenBody: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 60,
  },
  scrollContentTablet: {
    maxWidth: 768,
    alignSelf: 'center',
    width: '100%',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mutedText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.onSurfaceVariant,
    fontWeight: '500',
  },

  /* --- Hero Card --- */
  heroCard: {
    backgroundColor: theme.surfaceLowest,
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 24,
    elevation: 3,
    borderWidth: 1,
    borderColor: theme.surfaceHigh,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  bookingCodeLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.onSurfaceVariant,
    letterSpacing: 1,
    marginBottom: 4,
  },
  bookingCode: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.onSurface,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  heroBody: {
    flexDirection: 'column',
    gap: 8,
    marginBottom: 20,
  },
  bookedServiceLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  serviceName: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.onSurface,
    lineHeight: 30,
    flexShrink: 1,
  },
  otpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(196, 85, 8, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(196, 85, 8, 0.35)',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  otpBannerText: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: theme.primary,
    letterSpacing: 0.6,
  },
  price: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.primary,
  },
  snapshotBlock: {
    marginTop: 4,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.surfaceHigh,
  },
  snapshotBlockTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  snapshotBlockTitleSpaced: {
    marginTop: 14,
  },
  snapshotBlockValue: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.onSurface,
    marginTop: 4,
  },
  snapshotBlockMuted: {
    fontSize: 14,
    color: theme.onSurfaceVariant,
    marginTop: 4,
  },

  addOnSection: {
    marginBottom: 20,
  },
  addOnSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  addOnSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.onSurface,
  },
  addOnListCard: {
    backgroundColor: theme.surfaceLow,
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: theme.surfaceHigh,
  },
  addOnEmptyText: {
    fontSize: 14,
    color: theme.onSurfaceVariant,
    fontStyle: 'italic',
    paddingVertical: 14,
  },
  addOnRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
  },
  addOnRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.surfaceHigh,
  },
  addOnTextCol: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  addOnName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.onSurface,
  },
  addOnType: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    color: theme.primary,
    letterSpacing: 0.2,
  },
  addOnPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.onSurface,
  },
  totalPayableCard: {
    backgroundColor: theme.primary,
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  totalPayableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  totalPayableTextCol: {
    flex: 1,
  },
  totalPayableLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.surfaceLowest,
  },
  totalPayableHint: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  totalPayableAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.surfaceLowest,
  },
  frozenEconomicsCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: theme.surfaceLow,
    borderWidth: 1,
    borderColor: theme.surfaceHigh,
  },
  frozenEconomicsTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: theme.onSurface,
    marginBottom: 6,
  },
  frozenEconomicsHint: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.onSurfaceVariant,
    lineHeight: 17,
    marginBottom: 12,
  },
  frozenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.surfaceVariant,
  },
  frozenRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  frozenLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.onSurfaceVariant,
    flex: 1,
    paddingRight: 12,
  },
  frozenValue: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.onSurface,
  },
  frozenValueHighlight: {
    fontSize: 17,
    fontWeight: '900',
    color: theme.primary,
  },
  approvalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(196, 85, 8, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(196, 85, 8, 0.32)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
  },
  approvalBannerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(196, 85, 8, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  approvalBannerTextCol: {
    flex: 1,
    minWidth: 0,
  },
  approvalBannerTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: theme.onSurface,
    marginBottom: 4,
  },
  approvalBannerBody: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.onSurfaceVariant,
    lineHeight: 18,
  },
  rejectedNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: theme.surfaceLow,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.surfaceHigh,
  },
  rejectedNoticeText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: theme.onSurfaceVariant,
    lineHeight: 20,
  },

  /* --- Sections --- */
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.onSurface,
    marginBottom: 12,
    marginLeft: 4,
  },
  infoCard: {
    backgroundColor: theme.surfaceLowest,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.surfaceHigh,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  infoIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: theme.onSurfaceVariant,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.onSurface,
    lineHeight: 22,
    flexShrink: 1,
  },
  divider: {
    height: 1,
    backgroundColor: theme.surfaceHigh,
    marginVertical: 16,
    marginLeft: 56, // Aligns with the text, skipping the icon
  },

  /* --- Technician --- */
  techRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  techAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(165, 53, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  techDetails: {
    flex: 1,
  },
  techName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.onSurface,
    marginBottom: 2,
  },
  techSub: {
    fontSize: 13,
    color: theme.onSurfaceVariant,
  },
  iconButton: {
    width: 44,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: theme.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonDisabled: {
    opacity: 0.55,
  },

  /* --- Notes --- */
  notesText: {
    fontSize: 15,
    color: theme.onSurface,
    lineHeight: 24,
  },

  rescheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(196, 85, 8, 0.45)',
    backgroundColor: '#fff7ed',
  },
  rescheduleButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.primary,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(179, 27, 37, 0.45)',
    backgroundColor: '#fef2f2',
  },
  cancelButtonDisabled: {
    opacity: 0.55,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.error,
  },

  reviewCard: {
    marginTop: 24,
    marginBottom: 8,
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.onSurface,
    marginTop: 10,
  },
  reviewSub: {
    fontSize: 14,
    color: theme.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    backgroundColor: theme.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
  },
  invoiceBtn: {
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  googleReviewBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.primary,
    marginTop: 10,
  },
  reviewBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },

  /* --- Help Button --- */
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.surfaceHigh,
    backgroundColor: theme.surfaceLowest,
  },
  helpButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.onSurfaceVariant,
  },
});