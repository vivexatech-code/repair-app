import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { APP_NAME } from '../constants';
import { colors } from '../constants/colors';
import { radius, spacing } from '../constants/spacing';
import { Badge } from './Badge';

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=320&q=80';

export function ProfileHeader({
  name,
  email,
  bookingCount,
  onCart,
  onEditImage,
  imageUrl,
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.topRow}>
        <Text style={styles.brand}>{APP_NAME}</Text>
        <Pressable onPress={onCart} style={styles.cartBtn}>
          <Ionicons name="cart-outline" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.profileRow}>
        <View style={styles.avatarWrap}>
          <OptimizedImage
            uri={imageUrl}
            width={164}
            height={164}
            style={styles.avatar}
            contentFit="cover"
            priority="low"
          />
          <Pressable onPress={onEditImage} style={styles.editPill}>
            <Ionicons name="camera-outline" size={14} color={colors.surface} />
          </Pressable>
        </View>
        <View style={styles.meta}>
          <Text style={styles.name} numberOfLines={1}>
            {name || 'Guest User'}
          </Text>
          <Text style={styles.email} numberOfLines={1}>
            {email || 'No email'}
          </Text>
          <View style={styles.badges}>
            <Badge label="₹0 Repair Cash" />
            <Badge label={`${bookingCount || 0} Bookings`} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  brand: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
  },
  cartBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    marginRight: spacing.md,
  },
  avatar: {
    width: 82,
    height: 82,
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  editPill: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  meta: {
    flex: 1,
  },
  name: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.text,
  },
  email: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
