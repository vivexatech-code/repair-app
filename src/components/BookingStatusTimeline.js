import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { homeTheme, homeRadius } from './home/homeTheme';

function hasTs(value) {
  if (value == null || value === '') return false;
  if (typeof value?.toDate === 'function') return true;
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string') return Boolean(value.trim());
  return Boolean(value);
}

function formatTs(value) {
  try {
    const d =
      typeof value?.toDate === 'function'
        ? value.toDate()
        : value instanceof Date
          ? value
          : value
            ? new Date(value)
            : null;
    if (!d || Number.isNaN(d.getTime())) return '';
    return d.toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function normalizeStatus(status) {
  return String(status || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}

/**
 * Compact vertical status timeline for booking details.
 * Steps: Requested → Assigned → On the way / Arrived → In progress → Completed
 */
export function BookingStatusTimeline({ booking }) {
  const steps = useMemo(() => {
    if (!booking) return [];
    const status = normalizeStatus(booking.status);
    const cancelled = status === 'cancelled';

    const assigned =
      hasTs(booking.assignedAt) ||
      Boolean(booking.technicianId) ||
      ['assigned', 'inprogress', 'paused', 'completed'].includes(status);

    const enRoute =
      hasTs(booking.enRouteAt) ||
      hasTs(booking.onTheWayAt) ||
      hasTs(booking.technicianEnRouteAt) ||
      booking.technicianEnRoute === true ||
      booking.onTheWay === true ||
      normalizeStatus(booking.technicianTravelStatus) === 'ontheway' ||
      normalizeStatus(booking.travelStatus) === 'ontheway';

    const arrived =
      hasTs(booking.arrivedAt) ||
      hasTs(booking.otpVerifiedAt) ||
      normalizeStatus(booking.technicianTravelStatus) === 'arrived' ||
      normalizeStatus(booking.travelStatus) === 'arrived';

    const inProgress =
      hasTs(booking.startedAt) ||
      hasTs(booking.otpVerifiedAt) ||
      status === 'inprogress' ||
      status === 'paused' ||
      status === 'completed';

    const completed = status === 'completed' || hasTs(booking.completedAt);

    const onWayLabel = arrived ? 'Arrived' : 'On the way';
    const onWayDone = enRoute || arrived || inProgress || completed;
    const onWayActive =
      !completed &&
      !inProgress &&
      assigned &&
      (enRoute || arrived || (assigned && !inProgress && status === 'assigned'));

    let onWayTime = '';
    if (arrived) onWayTime = formatTs(booking.arrivedAt || booking.otpVerifiedAt);
    else if (enRoute) {
      onWayTime = formatTs(
        booking.enRouteAt || booking.onTheWayAt || booking.technicianEnRouteAt,
      );
    }

    const list = [
      {
        key: 'requested',
        label: 'Requested',
        icon: 'receipt-long',
        done: true,
        active: !assigned && !cancelled,
        time: formatTs(booking.createdAt),
      },
      {
        key: 'assigned',
        label: 'Assigned',
        icon: 'engineering',
        done: assigned || completed,
        active: assigned && !onWayDone && !inProgress && !completed && !cancelled,
        time: formatTs(booking.assignedAt),
      },
      {
        key: 'onway',
        label: onWayLabel,
        icon: arrived ? 'place' : 'directions-bike',
        done: onWayDone || completed,
        active: Boolean(onWayActive && !cancelled),
        time: onWayTime,
      },
      {
        key: 'progress',
        label: 'In progress',
        icon: 'handyman',
        done: inProgress || completed,
        active: (status === 'inprogress' || status === 'paused') && !completed,
        time: formatTs(booking.startedAt || booking.otpVerifiedAt),
      },
      {
        key: 'completed',
        label: cancelled ? 'Cancelled' : 'Completed',
        icon: cancelled ? 'cancel' : 'check-circle',
        done: completed || cancelled,
        active: completed || cancelled,
        time: formatTs(booking.completedAt || booking.cancelledAt),
      },
    ];

    return list;
  }, [booking]);

  if (!booking || !steps.length) return null;

  return (
    <View style={styles.card} accessibilityRole="summary">
      <Text style={styles.title}>Status timeline</Text>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const tone = step.done || step.active;
        const color = step.active
          ? homeTheme.primary
          : step.done
            ? homeTheme.success
            : homeTheme.textMuted;
        return (
          <View key={step.key} style={styles.row}>
            <View style={styles.rail}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: tone ? color : homeTheme.borderLight,
                    borderColor: tone ? color : homeTheme.border,
                  },
                ]}
              >
                <MaterialIcons
                  name={step.icon}
                  size={14}
                  color={tone ? '#fff' : homeTheme.textMuted}
                />
              </View>
              {!isLast ? (
                <View
                  style={[
                    styles.line,
                    { backgroundColor: step.done ? homeTheme.success : homeTheme.borderLight },
                  ]}
                />
              ) : null}
            </View>
            <View style={[styles.content, isLast && styles.contentLast]}>
              <Text style={[styles.label, step.active && styles.labelActive, !tone && styles.labelMuted]}>
                {step.label}
              </Text>
              {step.time ? <Text style={styles.time}>{step.time}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: homeTheme.surface,
    borderRadius: homeRadius.lg,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: homeTheme.borderLight,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: homeTheme.textSecondary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    minHeight: 44,
  },
  rail: {
    width: 28,
    alignItems: 'center',
  },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  line: {
    width: 2,
    flex: 1,
    marginVertical: 3,
    borderRadius: 1,
  },
  content: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 14,
  },
  contentLast: {
    paddingBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: homeTheme.text,
  },
  labelActive: {
    color: homeTheme.primary,
  },
  labelMuted: {
    color: homeTheme.textMuted,
    fontWeight: '600',
  },
  time: {
    marginTop: 2,
    fontSize: 12,
    color: homeTheme.textMuted,
  },
});
