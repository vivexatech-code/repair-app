import React, { useEffect, useMemo, useState } from 'react';
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
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useBookingFlow } from '../../context/BookingFlowContext';
import { useCart } from '../../context/CartContext';
import { useLocationContext } from '../../context/LocationContext';
import {
  getVisibleSlotsForDate,
  formatLocalDateKey,
} from '../../services/bookingAllocationService';
import { isSlotPastForDate, BOOKING_SLOT_START_HOUR_LOCAL } from '../../constants/bookingSlots';
import { rescheduleBooking } from '../../services/bookingService';

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

function nextDays(count) {
  const out = [];
  const now = new Date();
  for (let i = 0; i < count; i += 1) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    out.push(d);
  }
  return out;
}

/** Stable local datetime for the picked calendar day + canonical slot index. */
function combineDayAndSlotIndex(dayDate, slotIndex) {
  const d = new Date(dayDate);
  const idx = Number(slotIndex);
  const h =
    BOOKING_SLOT_START_HOUR_LOCAL[idx] != null
      ? BOOKING_SLOT_START_HOUR_LOCAL[idx]
      : 9;
  d.setHours(h, 0, 0, 0);
  return d;
}

export function ScheduleScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  const navigation = useNavigation();
  const route = useRoute();

  const { address, setScheduledAt, setScheduledSlotMeta, revisitParent } = useBookingFlow();
  const { items } = useCart();
  const { coords } = useLocationContext();

  const reschedule = route.params?.reschedule || null;
  const isReschedule = Boolean(reschedule?.bookingId);

  /** Cart → revisit parent → reschedule booking (empty cart must still load slots). */
  const categoryId = useMemo(() => {
    if (revisitParent?.categoryId != null && String(revisitParent.categoryId).trim()) {
      return String(revisitParent.categoryId).trim();
    }
    if (reschedule?.categoryId != null && String(reschedule.categoryId).trim()) {
      return String(reschedule.categoryId).trim();
    }
    if (items[0]?.categoryId != null && String(items[0].categoryId).trim()) {
      return String(items[0].categoryId).trim();
    }
    return '';
  }, [revisitParent?.categoryId, reschedule?.categoryId, items]);

  const userLat = useMemo(() => {
    const fromReschedule = Number(reschedule?.lat);
    if (Number.isFinite(fromReschedule)) return fromReschedule;
    const a = Number(address?.lat);
    if (Number.isFinite(a)) return a;
    const c = coords?.latitude;
    return Number.isFinite(Number(c)) ? Number(c) : null;
  }, [reschedule?.lat, address?.lat, coords?.latitude]);

  const userLng = useMemo(() => {
    const fromReschedule = Number(reschedule?.lng);
    if (Number.isFinite(fromReschedule)) return fromReschedule;
    const a = Number(address?.lng);
    if (Number.isFinite(a)) return a;
    const c = coords?.longitude;
    return Number.isFinite(Number(c)) ? Number(c) : null;
  }, [reschedule?.lng, address?.lng, coords?.longitude]);

  const days = useMemo(() => nextDays(7), []);
  const [pickedDay, setPickedDay] = useState(days[0]);
  const [visibleSlots, setVisibleSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const [pickedSlot, setPickedSlot] = useState(null);
  const [noEligibleTechnicians, setNoEligibleTechnicians] = useState(false);
  const [allSlotsBusy, setAllSlotsBusy] = useState(false);
  const [rescheduleSaving, setRescheduleSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!categoryId || userLat == null || userLng == null) {
        setVisibleSlots([]);
        setPickedSlot(null);
        setSlotsError('');
        setNoEligibleTechnicians(false);
        setAllSlotsBusy(false);
        return;
      }
      setSlotsLoading(true);
      setSlotsError('');
      try {
        const result = await getVisibleSlotsForDate({
          categoryId,
          userLat,
          userLng,
          pickedDate: pickedDay,
        });
        if (cancelled) return;
        const vs = Array.isArray(result?.visibleSlots) ? result.visibleSlots : [];
        setVisibleSlots(vs);
        setNoEligibleTechnicians(Boolean(result?.noEligibleTechnicians));
        setAllSlotsBusy(Boolean(result?.allSlotsBusy));
        setPickedSlot((prev) => {
          if (!vs.length) return null;
          if (prev && vs.some((s) => s.slotIndex === prev.slotIndex)) return prev;
          return vs[0];
        });
      } catch (e) {
        if (!cancelled) {
          setSlotsError(e?.message || 'Could not load time slots.');
          setVisibleSlots([]);
          setPickedSlot(null);
          setNoEligibleTechnicians(false);
          setAllSlotsBusy(false);
        }
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pickedDay, categoryId, userLat, userLng]);

  useEffect(() => {
    if (!pickedSlot || userLat == null || userLng == null) {
      setScheduledAt(null);
      setScheduledSlotMeta(null);
      return;
    }
    const at = combineDayAndSlotIndex(pickedDay, pickedSlot.slotIndex);
    setScheduledAt(at);
    setScheduledSlotMeta({
      slotDateStr: formatLocalDateKey(pickedDay),
      slotLabel: pickedSlot.slot,
      slotIndex: pickedSlot.slotIndex,
    });
  }, [pickedDay, pickedSlot, setScheduledAt, setScheduledSlotMeta, userLat, userLng]);

  const formattedSelection = pickedSlot
    ? combineDayAndSlotIndex(pickedDay, pickedSlot.slotIndex).toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';

  const warnNoCategory = !categoryId;
  const warnNoLocation = userLat == null || userLng == null;

  const onContinue = async () => {
    if (!pickedSlot || warnNoCategory || rescheduleSaving) return;

    if (isReschedule) {
      setRescheduleSaving(true);
      try {
        const at = combineDayAndSlotIndex(pickedDay, pickedSlot.slotIndex);
        await rescheduleBooking({
          bookingId: reschedule.bookingId,
          scheduledAt: at,
          scheduledSlotDateStr: formatLocalDateKey(pickedDay),
          scheduledSlotLabel: pickedSlot.slot,
          scheduledSlotIndex: pickedSlot.slotIndex,
          userLat,
          userLng,
        });
        Alert.alert('Rescheduled', 'Your booking time has been updated.', [
          {
            text: 'OK',
            onPress: () =>
              navigation.navigate('BookingDetails', {
                bookingId: String(reschedule.bookingId),
              }),
          },
        ]);
      } catch (e) {
        Alert.alert('Reschedule failed', e?.message || 'Could not update the booking time.');
      } finally {
        setRescheduleSaving(false);
      }
      return;
    }

    navigation.navigate('Confirm');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.surface} />

      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={theme.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isReschedule ? 'Reschedule' : revisitParent?.id ? 'Free revisit' : 'Select Date & Time'}
        </Text>
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
          <Text style={styles.heroTitle}>When should we arrive?</Text>
          <Text style={styles.heroSubtitle}>
            Times are fixed for each day. We only hide a slot when every nearby partner is already
            booked for that time (from busySlots).
          </Text>
        </View>

        {warnNoCategory ? (
          <View style={styles.bannerWarn}>
            <MaterialIcons name="warning" size={20} color={theme.error} />
            <Text style={styles.bannerWarnText}>
              {revisitParent?.id || isReschedule
                ? 'Missing service category for this booking. Please go back and try again.'
                : 'Add a service to your cart first to load available slots.'}
            </Text>
          </View>
        ) : null}

        {warnNoLocation ? (
          <View style={styles.bannerWarn}>
            <MaterialIcons name="place" size={20} color={theme.primary} />
            <Text style={styles.bannerWarnText}>
              Set your service address on the map so we can match nearby partners.
            </Text>
          </View>
        ) : null}

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Select Date</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScrollPad}
          >
            {days.map((d) => {
              const active = pickedDay.toDateString() === d.toDateString();
              const dayOfWeek = d.toLocaleDateString(undefined, { weekday: 'short' });
              const dayOfMonth = d.toLocaleDateString(undefined, { day: 'numeric' });
              const month = d.toLocaleDateString(undefined, { month: 'short' });

              return (
                <TouchableOpacity
                  key={d.toISOString()}
                  activeOpacity={0.7}
                  onPress={() => setPickedDay(d)}
                  style={[styles.dateCard, active && styles.dateCardActive]}
                >
                  <Text style={[styles.dateDayText, active && styles.textActive]}>{dayOfWeek}</Text>
                  <Text style={[styles.dateNumberText, active && styles.textActive]}>{dayOfMonth}</Text>
                  <Text style={[styles.dateMonthText, active && styles.textActive]}>{month}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={[styles.sectionContainer, styles.paddingHorizontal]}>
          <Text style={styles.sectionTitle}>Select Time</Text>
          {slotsLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={theme.primary} />
              <Text style={styles.loadingText}>Checking partner availability…</Text>
            </View>
          ) : null}
          {slotsError ? <Text style={styles.errText}>{slotsError}</Text> : null}
          {!slotsLoading &&
          !warnNoCategory &&
          !warnNoLocation &&
          !slotsError &&
          visibleSlots.length === 0 ? (
            <Text style={styles.emptySlots}>
              {noEligibleTechnicians
                ? 'No service partners in range for this category. Try another location or extend your pin on the map.'
                : allSlotsBusy
                  ? 'No open slots available on this day. Every time window is booked with nearby partners.'
                  : ''}
            </Text>
          ) : null}

          <View style={styles.timeGrid}>
            {visibleSlots.map((def) => {
              const active =
                pickedSlot?.slotIndex === def.slotIndex && pickedSlot?.slot === def.slot;
              return (
                <TouchableOpacity
                  key={`${def.slotIndex}-${def.slot}`}
                  activeOpacity={0.7}
                  onPress={() => setPickedSlot(def)}
                  style={[styles.timeChip, active && styles.timeChipActive]}
                >
                  <Text style={[styles.timeText, active && styles.timeTextActive]} numberOfLines={2}>
                    {def.slot}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.selectionInfo}>
          <Text style={styles.selectionLabel}>Selected Slot</Text>
          <Text style={styles.selectionValue}>
            {pickedSlot ? formattedSelection : 'Choose a time'}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.checkoutBtnWrapper,
            (!pickedSlot || warnNoCategory || rescheduleSaving) && { opacity: 0.55 },
          ]}
          onPress={onContinue}
          disabled={!pickedSlot || warnNoCategory || rescheduleSaving}
        >
          <LinearGradient
            colors={[theme.primary, theme.primaryContainer]}
            style={styles.checkoutBtn}
          >
            {rescheduleSaving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Text style={styles.checkoutBtnText}>
                  {isReschedule
                    ? 'Confirm new time'
                    : revisitParent?.id
                      ? 'Review free revisit'
                      : 'Review & Confirm'}
                </Text>
                <MaterialIcons name="arrow-forward" size={18} color="#ffffff" />
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
    paddingTop: 24,
    paddingBottom: 140,
  },
  scrollContentTablet: {
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  paddingHorizontal: {
    paddingHorizontal: 20,
  },
  heroSection: {
    marginBottom: 24,
    paddingHorizontal: 20,
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
  bannerWarn: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(196, 85, 8, 0.08)',
    borderWidth: 1,
    borderColor: theme.surfaceHigh,
  },
  bannerWarnText: {
    flex: 1,
    fontSize: 14,
    color: theme.onSurface,
    lineHeight: 20,
  },
  sectionContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.onSurface,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  horizontalScrollPad: {
    paddingHorizontal: 20,
    gap: 12,
  },
  dateCard: {
    width: 72,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surfaceLowest,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.surfaceHigh,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  dateCardActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
    shadowColor: theme.primary,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
  },
  dateDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.onSurfaceVariant,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  dateNumberText: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.onSurface,
  },
  dateMonthText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.onSurfaceVariant,
    marginTop: 2,
  },
  textActive: {
    color: '#ffffff',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 14,
    color: theme.onSurfaceVariant,
  },
  errText: {
    color: theme.error,
    fontSize: 13,
    marginBottom: 8,
  },
  emptySlots: {
    fontSize: 14,
    color: theme.onSurfaceVariant,
    marginBottom: 12,
    lineHeight: 20,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  timeChip: {
    minWidth: '42%',
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: theme.surfaceLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.surfaceHigh,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  timeChipActive: {
    borderColor: theme.primary,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.onSurface,
    textAlign: 'center',
  },
  timeTextActive: {
    color: theme.primary,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 20,
  },
  selectionInfo: {
    marginBottom: 16,
  },
  selectionLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  selectionValue: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.primary,
  },
  checkoutBtnWrapper: {
    width: '100%',
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  checkoutBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
