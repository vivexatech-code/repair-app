import React, { useMemo, useState } from 'react';
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
  FlatList,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// External contexts and components from your original code
import { useAuth } from '../../context/AuthContext';
import { useGuestBrowse } from '../../context/GuestBrowseContext';
import { useBookings } from '../../context/BookingsContext';
import { BOOKING_STATUS } from '../../constants';
import { BookingCardSkeleton } from '../../components/SkeletonLoader';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { OptimizedImage } from '../../components/OptimizedImage';
import { openPhoneDialer } from '../../utils/phoneDial';
import {
  formatScheduledDateLabel,
  formatScheduledTimeLabel,
  getCompletedServiceDurationLabel,
  formatServiceStartedAtLabel,
  getBookingDisplayServiceName,
  getBookingDisplayCategoryName,
} from '../../utils/bookingDisplay';
import { hasPendingCustomerApproval } from '../../utils/bookingApproval';
import { BookingApprovalBanner } from '../../components/BookingApprovalBanner';
import { SectionPromoBanner } from '../../components/SectionPromoBanner';
import { canClaimRevisit } from '../../utils/revisitEligibility';

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

function isUpcomingBookingStatus(status) {
  const s = String(status ?? '').trim();
  if (s === BOOKING_STATUS.IN_PROGRESS) return false;
  const low = s.toLowerCase();
  return low !== 'completed' && low !== 'cancelled';
}

function getProcessingServiceImageUri(booking) {
  const candidates = [
    booking?.serviceImage,
    booking?.serviceImageUrl,
    booking?.imageUrl,
    booking?.thumbnailUrl,
    booking?.service?.image,
    booking?.service?.imageUrl,
    booking?.servicePhoto,
  ];
  for (const c of candidates) {
    const u = c != null ? String(c).trim() : '';
    if (u && (u.startsWith('http://') || u.startsWith('https://'))) return u;
  }
  return null;
}

const TABS = [
  {
    id: 'upcoming',
    label: 'Upcoming',
    filter: (b) => isUpcomingBookingStatus(b?.status),
  },
  {
    id: 'processing',
    label: 'Processing',
    filter: (b) => String(b?.status ?? '') === BOOKING_STATUS.IN_PROGRESS,
  },
  {
    id: 'completed',
    label: 'Completed',
    filter: (b) => String(b?.status ?? '').toLowerCase() === 'completed',
  },
  {
    id: 'cancelled',
    label: 'Cancelled',
    filter: (b) => String(b?.status ?? '').toLowerCase() === 'cancelled',
  },
];


export function BookingsScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  const navigation = useNavigation();
  const { user } = useAuth();
  const { promptLogin } = useGuestBrowse();

  const { bookings, loading, error } = useBookings();
  const bookingsList = Array.isArray(bookings) ? bookings : [];
  const [activeTabId, setActiveTabId] = useState('upcoming');

  // Filter bookings based on active tab statuses
  const rows = useMemo(() => {
    const cfg = TABS.find((t) => t.id === activeTabId);
    if (!cfg) return [];
    return bookingsList.filter((b) => cfg.filter(b));
  }, [bookingsList, activeTabId]);

  const renderHeader = () => (
    <>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <Text style={styles.heroTitle}>
          Your <Text style={styles.heroTitleHighlight}>Appointments</Text>
        </Text>
        <Text style={styles.heroSubtitle}>
          Manage your upcoming service visits and view your maintenance history.
        </Text>
      </View>

      <BookingApprovalBanner
        bookings={bookingsList}
        navigation={navigation}
        style={{ marginBottom: 8 }}
      />

      <SectionPromoBanner section="bookings" />

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          {TABS.map((tab) => (
            <FilterTab
              key={tab.id}
              label={tab.label}
              isActive={activeTabId === tab.id}
              onPress={() => setActiveTabId(tab.id)}
            />
          ))}
        </ScrollView>
      </View>
    </>
  );

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={theme.surface} />
        <ScreenContainer style={styles.screenInner}>
          <View style={styles.guestBookings}>
            <MaterialIcons name="event-note" size={56} color={theme.surfaceHigh} />
            <Text style={styles.guestBookingsTitle}>Sign in to view bookings</Text>
            <Text style={styles.guestBookingsSub}>
              Create an account or sign in to schedule services and track your appointments.
            </Text>
            <Button title="Sign in" onPress={() => promptLogin()} />
          </View>
        </ScreenContainer>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.surface} />

      <ScreenContainer style={styles.screenInner}>
      <FlatList
        data={loading ? [] : rows}
        keyExtractor={(item, index) =>
          item?.id != null ? String(item.id) : `booking-${index}`
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          isTablet && styles.scrollContentTablet
        ]}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              {[1, 2, 3].map((k) => (
                <BookingCardSkeleton key={k} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="event-busy" size={48} color={theme.surfaceHigh} />
              <Text style={styles.emptyText}>
                {error || 'No bookings found in this tab.'}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) =>
          String(item?.status ?? '') === BOOKING_STATUS.IN_PROGRESS ? (
            <InProgressBookingCard
              booking={item}
              isTablet={isTablet}
              onPress={() => navigation.navigate('BookingDetails', { bookingId: item.id })}
              onApprovePress={(id) =>
                navigation.navigate('BookingApproval', { bookingId: id })
              }
            />
          ) : (
            <AppointmentCard
              booking={item}
              isTablet={isTablet}
              onPress={() => navigation.navigate('BookingDetails', { bookingId: item.id })}
              onApprovePress={(id) =>
                navigation.navigate('BookingApproval', { bookingId: id })
              }
            />
          )
        }
      />

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('MainTabs', { screen: 'Services' })}
      >
        <MaterialIcons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>
      </ScreenContainer>
    </SafeAreaView>
  );
}

// --- Sub-Components ---

const FilterTab = ({ label, isActive, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.tabButton, isActive ? styles.tabActive : styles.tabInactive]}
    activeOpacity={0.7}
  >
    <Text
      style={[
        styles.tabText,
        isActive ? styles.tabTextActive : styles.tabTextInactive,
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const InProgressBookingCard = ({ booking, isTablet, onPress, onApprovePress }) => {
  const needsApproval = hasPendingCustomerApproval(booking);
  const uri = getProcessingServiceImageUri(booking);
  const serviceName = getBookingDisplayServiceName(booking);
  const categoryLabel = getBookingDisplayCategoryName(booking);
  const technician =
    booking.technicianName || booking.technician?.name || 'Partner';
  const phoneRaw = booking.technicianPhone ?? booking.technician?.phone ?? '';
  const phone = String(phoneRaw ?? '').trim();
  const scheduledDate = formatScheduledDateLabel(booking);
  const scheduledTime = formatScheduledTimeLabel(booking);
  const startedLabel = formatServiceStartedAtLabel(booking);

  const scheduleLine =
    scheduledTime != null ? `${scheduledDate}, ${scheduledTime}` : scheduledDate;

  const onCall = async () => {
    await openPhoneDialer(phone || null);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      style={[styles.card, styles.processingCard, isTablet && styles.cardTablet]}
    >
      <View
        style={[
          styles.processingTopRow,
          isTablet ? styles.processingTopRowTablet : styles.processingTopRowMobile,
        ]}
      >
        <View style={styles.procImageWrap}>
          {uri ? (
            <OptimizedImage
              uri={uri}
              width={88}
              height={88}
              style={styles.procImage}
              contentFit="cover"
            />
          ) : (
            <View style={styles.procImageFallback}>
              <MaterialIcons name="home-repair-service" size={36} color={theme.primary} />
            </View>
          )}
        </View>
        <View style={styles.processingMainCol}>
          <View style={styles.processingBadge}>
            <View style={styles.processingBadgeDot} />
            <Text style={styles.processingBadgeText}>Service in Progress</Text>
          </View>
          <Text style={styles.processingTitle} numberOfLines={2}>
            {serviceName}
          </Text>
          <Text style={styles.categorySubtitle} numberOfLines={1}>
            {categoryLabel}
          </Text>
          <View style={styles.processingMeta}>
            <MaterialIcons name="person" size={16} color={theme.onSurfaceVariant} />
            <Text style={styles.processingMetaText} numberOfLines={1}>
              {technician}
            </Text>
          </View>
          {phone ? (
            <TouchableOpacity
              style={styles.processingPhoneRow}
              onPress={(e) => {
                e?.stopPropagation?.();
                onCall();
              }}
              activeOpacity={0.75}
            >
              <MaterialIcons name="phone" size={18} color={theme.primary} />
              <Text style={styles.processingPhoneText} numberOfLines={1}>
                {phone}
              </Text>
            </TouchableOpacity>
          ) : null}
          <View style={styles.processingMeta}>
            <MaterialIcons name="event" size={16} color={theme.onSurfaceVariant} />
            <Text style={styles.processingMetaText} numberOfLines={2}>
              {scheduleLine}
            </Text>
          </View>
          {startedLabel ? (
            <View style={styles.processingMeta}>
              <MaterialIcons name="play-circle-outline" size={16} color={theme.success} />
              <Text style={styles.processingStartedText}>Started {startedLabel}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {needsApproval ? (
        <TouchableOpacity
          style={styles.approvalStrip}
          activeOpacity={0.85}
          onPress={(e) => {
            e?.stopPropagation?.();
            onApprovePress?.(String(booking.id));
          }}
        >
          <MaterialIcons name="notification-important" size={18} color={theme.primary} />
          <Text style={styles.approvalStripText}>Approval required — tap to review</Text>
          <MaterialIcons name="chevron-right" size={20} color={theme.primary} />
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity style={styles.rescheduleBtn} activeOpacity={0.75} onPress={onPress}>
        <Text style={styles.rescheduleBtnText}>View details</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const AppointmentCard = ({ booking, isTablet, onPress, onApprovePress }) => {
  // Determine if the card should be highlighted based on status
  const isActive = [BOOKING_STATUS.NEW, BOOKING_STATUS.ASSIGNED].includes(booking.status);
  const needsApproval = hasPendingCustomerApproval(booking);

  const serviceName = getBookingDisplayServiceName(booking);
  const categoryLabel = getBookingDisplayCategoryName(booking);
  const title = serviceName;
  const technician =
    booking.technicianName || booking.technician?.name || 'Assigning soon';
  const location = booking.address?.city || booking.location || 'Address pending';
  const displayDate = formatScheduledDateLabel(booking);
  const completedDuration =
    booking.status === BOOKING_STATUS.COMPLETED
      ? getCompletedServiceDurationLabel(booking)
      : null;
  const scheduledTimeLine = formatScheduledTimeLabel(booking);
  const headlineLine =
    booking.status === BOOKING_STATUS.COMPLETED && completedDuration
      ? `Total Time: ${completedDuration}`
      : scheduledTimeLine || serviceName;
  const showOtp =
    booking.status === BOOKING_STATUS.ASSIGNED &&
    booking.otp != null &&
    String(booking.otp).trim() !== '';

  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={onPress} 
      style={[styles.card, isTablet && styles.cardTablet]}
    >
      {/* Left/Top Section: Date & Time */}
      <View style={[styles.cardDateTime, isTablet ? styles.cardDateTimeTablet : styles.cardDateTimeMobile]}>
        <View style={[styles.iconBox, isActive ? styles.iconBoxActive : styles.iconBoxInactive]}>
          <MaterialIcons
            name="home-repair-service" // Fallback generic icon
            size={28}
            color={isActive ? theme.primary : theme.onSurfaceVariant}
          />
        </View>
        <View>
          <Text style={[styles.dayLabel, isActive ? { color: theme.primary } : { color: theme.onSurfaceVariant }]}>
            {isActive ? 'Upcoming' : booking.status}
          </Text>
          <Text style={styles.timeText}>{headlineLine}</Text>
          <Text style={styles.dateText}>{displayDate}</Text>
        </View>
      </View>

      {/* Right/Bottom Section: Details & Actions */}
      <View style={styles.cardDetails}>
        <View style={styles.detailsHeader}>
          <View style={styles.detailsTitleColumn}>
            <Text style={styles.cardTitle} numberOfLines={2}>{title}</Text>
            <Text style={styles.detailsCategoryLine} numberOfLines={1}>
              {categoryLabel}
            </Text>
          </View>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: isActive ? theme.primary : '#9ca3af' }]} />
            <Text style={styles.statusText}>{booking.status}</Text>
          </View>
        </View>

        {needsApproval ? (
          <TouchableOpacity
            style={styles.approvalStrip}
            activeOpacity={0.85}
            onPress={() => onApprovePress?.(String(booking.id))}
          >
            <MaterialIcons name="notification-important" size={18} color={theme.primary} />
            <Text style={styles.approvalStripText}>Approval required — tap to review</Text>
            <MaterialIcons name="chevron-right" size={20} color={theme.primary} />
          </TouchableOpacity>
        ) : null}

        <View style={styles.infoRows}>
          <View style={styles.infoRow}>
            <MaterialIcons name="person" size={18} color={theme.onSurfaceVariant} />
            <Text style={styles.infoRowText}>Partner: {technician}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="location-on" size={18} color={theme.onSurfaceVariant} />
            <Text style={styles.infoRowText}>Location: {location}</Text>
          </View>
        </View>

        {showOtp && (
          <View style={styles.otpBanner}>
            <MaterialIcons name="vpn-key" size={18} color={theme.primary} />
            <Text style={styles.otpBannerText}>
              Aapka OTP: {String(booking.otp)}
            </Text>
          </View>
        )}

        {canClaimRevisit(booking) ? (
          <TouchableOpacity
            style={styles.revisitStrip}
            activeOpacity={0.85}
            onPress={onPress}
          >
            <MaterialIcons name="replay" size={18} color={theme.primary} />
            <Text style={styles.revisitStripText}>Free revisit available — tap to claim</Text>
            <MaterialIcons name="chevron-right" size={20} color={theme.primary} />
          </TouchableOpacity>
        ) : null}

        {isActive && (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.rescheduleBtn} activeOpacity={0.7} onPress={onPress}>
              <Text style={styles.rescheduleBtnText}>View Details</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

// --- Styles ---

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.surface,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  screenInner: {
    flex: 1,
  },
  guestBookings: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 100,
  },
  guestBookingsTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '800',
    color: theme.onSurface,
    textAlign: 'center',
  },
  guestBookingsSub: {
    marginTop: 10,
    marginBottom: 28,
    fontSize: 15,
    color: theme.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 140, 
    gap: 24, 
  },
  scrollContentTablet: {
    maxWidth: 768,
    alignSelf: 'center',
    width: '100%',
  },

  /* --- Header --- */
  headerSection: {
    marginBottom: 32,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: theme.onSurface,
    lineHeight: 44,
    marginBottom: 8,
    letterSpacing: -1,
  },
  heroTitleHighlight: {
    color: theme.primary,
  },
  heroSubtitle: {
    fontSize: 16,
    color: theme.onSurfaceVariant,
    lineHeight: 24,
    maxWidth: '90%',
  },

  /* --- Tabs --- */
  tabsContainer: {
    marginBottom: 8, // Reduced since FlatList gap handles spacing
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(224, 227, 228, 0.8)',
    paddingBottom: 16,
    marginHorizontal: -20, // Full bleed border
  },
  tabsScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  tabButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
  },
  tabActive: {
    backgroundColor: theme.primary,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  tabInactive: {
    backgroundColor: theme.surfaceLow,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  tabTextInactive: {
    color: theme.onSurfaceVariant,
  },

  /* --- Lists & Loading --- */
  loadingContainer: {
    gap: 16,
    marginTop: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    textAlign: 'center',
    color: theme.onSurfaceVariant,
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },

  /* --- In Progress card --- */
  processingCard: {
    borderColor: 'rgba(37, 99, 235, 0.2)',
  },
  processingTopRow: {
    gap: 16,
    marginBottom: 16,
  },
  processingTopRowMobile: {
    flexDirection: 'column',
  },
  processingTopRowTablet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  procImageWrap: {
    width: 88,
    height: 88,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: theme.surfaceHigh,
    alignSelf: 'flex-start',
  },
  procImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  procImageFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(196, 85, 8, 0.08)',
  },
  processingMainCol: {
    flex: 1,
    minWidth: 0,
  },
  processingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 10,
  },
  processingBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
  },
  processingBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#1e40af',
  },
  processingTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.onSurface,
    marginBottom: 4,
  },
  categorySubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.onSurfaceVariant,
    marginBottom: 8,
  },
  processingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  processingMetaText: {
    flex: 1,
    fontSize: 13,
    color: theme.onSurfaceVariant,
    fontWeight: '600',
  },
  processingPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  processingPhoneText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: theme.primary,
  },
  processingStartedText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: theme.success,
  },

  /* --- Appointment Card --- */
  card: {
    backgroundColor: theme.surfaceLowest,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.04,
    shadowRadius: 40,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(224, 227, 228, 0.8)',
    flexDirection: 'column',
  },
  cardTablet: {
    flexDirection: 'row',
    gap: 24,
  },
  cardDateTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  cardDateTimeMobile: {
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.surfaceHigh,
  },
  cardDateTimeTablet: {
    width: '33%',
    paddingRight: 24,
    borderRightWidth: 1,
    borderRightColor: theme.surfaceHigh,
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxActive: {
    backgroundColor: 'rgba(165, 53, 0, 0.1)', // primary with 10% opacity
  },
  iconBoxInactive: {
    backgroundColor: theme.surfaceHigh,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  timeText: {
    fontSize: 20,
    fontWeight: '900',
    color: theme.onSurface,
  },
  dateText: {
    fontSize: 13,
    color: theme.onSurfaceVariant,
    marginTop: 4,
  },
  cardDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  detailsTitleColumn: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.onSurface,
  },
  detailsCategoryLine: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.onSurfaceVariant,
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.surfaceHigh,
    paddingHorizontal: 12,
    paddingVertical: 4,
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
    color: theme.onSurface,
    textTransform: 'capitalize',
  },
  approvalStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(196, 85, 8, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(196, 85, 8, 0.28)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 14,
  },
  revisitStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(22, 163, 74, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.28)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 14,
  },
  revisitStripText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: theme.success,
  },
  approvalStripText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: theme.onSurface,
  },
  infoRows: {
    gap: 8,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoRowText: {
    fontSize: 13,
    color: theme.onSurfaceVariant,
  },
  otpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(196, 85, 8, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(196, 85, 8, 0.35)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  otpBannerText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: theme.primary,
    letterSpacing: 0.5,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  rescheduleBtn: {
    flex: 1,
    backgroundColor: theme.surfaceLow,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rescheduleBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.onSurface,
  },

  /* --- Floating Action Button --- */
  fab: {
    position: 'absolute',
    bottom: 100, // Clears bottom tab navigation
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
});