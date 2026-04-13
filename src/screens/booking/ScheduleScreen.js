import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Header } from '../../components/Header';
import { Button } from '../../components/Button';
import { colors } from '../../constants/colors';
import { spacing, radius } from '../../constants/spacing';
import { useBookingFlow } from '../../context/BookingFlowContext';

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

const SLOTS = [
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
];

export function ScheduleScreen() {
  const navigation = useNavigation();
  const { scheduledAt, setScheduledAt } = useBookingFlow();
  const days = useMemo(() => nextDays(7), []);
  const [pickedDay, setPickedDay] = useState(days[0]);
  const [pickedSlot, setPickedSlot] = useState(SLOTS[2]);

  React.useEffect(() => {
    const [h, m] = pickedSlot.split(':').map(Number);
    const d = new Date(pickedDay);
    d.setHours(h, m, 0, 0);
    setScheduledAt(d);
  }, [pickedDay, pickedSlot, setScheduledAt]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="Schedule" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.section}>Date</Text>
        <View style={styles.rowWrap}>
          {days.map((d) => {
            const active =
              pickedDay.toDateString() === d.toDateString();
            return (
              <Pressable
                key={d.toISOString()}
                onPress={() => setPickedDay(d)}
                style={[styles.dayChip, active && styles.dayChipActive]}
              >
                <Text style={[styles.dayText, active && styles.dayTextActive]}>
                  {d.toLocaleDateString(undefined, {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.section}>Time</Text>
        <View style={styles.rowWrap}>
          {SLOTS.map((slot) => {
            const active = pickedSlot === slot;
            return (
              <Pressable
                key={slot}
                onPress={() => setPickedSlot(slot)}
                style={[styles.slotChip, active && styles.slotChipActive]}
              >
                <Text
                  style={[styles.slotText, active && styles.slotTextActive]}
                >
                  {slot}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {scheduledAt ? (
          <Text style={styles.preview}>
            Selected:{' '}
            {scheduledAt.toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </Text>
        ) : null}
        <Button
          title="Review & confirm"
          onPress={() => navigation.navigate('Confirm')}
        />
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
  section: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
    color: colors.text,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  dayChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  dayChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  dayTextActive: {
    color: colors.surface,
  },
  slotChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  slotChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '18',
  },
  slotText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  slotTextActive: {
    color: colors.primaryDark,
  },
  preview: {
    marginVertical: spacing.lg,
    fontSize: 15,
    color: colors.textSecondary,
  },
});
