import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Header } from '../../components/Header';
import { Button } from '../../components/Button';
import { colors } from '../../constants/colors';
import { spacing, radius, shadows } from '../../constants/spacing';
import { useCart } from '../../context/CartContext';

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=200&q=80';

export function CartScreen() {
  const navigation = useNavigation();
  const { items, setQuantity, subtotal, totalDuration } = useCart();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="Cart" onBack={() => navigation.goBack()} />
      {items.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.empty}>Your cart is empty.</Text>
          <Button
            title="Browse services"
            onPress={() => navigation.navigate('MainTabs', { screen: 'Services' })}
          />
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.list}>
            {items.map((line) => (
              <View key={line.serviceId} style={styles.row}>
                <Image
                  source={{ uri: line.imageUrl || PLACEHOLDER }}
                  style={styles.thumb}
                />
                <View style={styles.meta}>
                  <Text style={styles.name} numberOfLines={2}>
                    {line.name}
                  </Text>
                  <Text style={styles.price}>₹{line.price} each</Text>
                  <View style={styles.qtyRow}>
                    <Pressable
                      style={styles.qtyBtn}
                      onPress={() =>
                        setQuantity(line.serviceId, line.quantity - 1)
                      }
                    >
                      <Text style={styles.qtyText}>−</Text>
                    </Pressable>
                    <Text style={styles.qtyVal}>{line.quantity}</Text>
                    <Pressable
                      style={styles.qtyBtn}
                      onPress={() =>
                        setQuantity(line.serviceId, line.quantity + 1)
                      }
                    >
                      <Text style={styles.qtyText}>+</Text>
                    </Pressable>
                  </View>
                </View>
                <Text style={styles.lineTotal}>
                  ₹{line.price * line.quantity}
                </Text>
              </View>
            ))}
          </ScrollView>
          <View style={styles.summary}>
            <View style={styles.sumRow}>
              <Text style={styles.sumLabel}>Duration (est.)</Text>
              <Text style={styles.sumVal}>{totalDuration} min</Text>
            </View>
            <View style={styles.sumRow}>
              <Text style={styles.sumLabel}>Subtotal</Text>
              <Text style={styles.sumVal}>₹{subtotal}</Text>
            </View>
            <View style={styles.sumRow}>
              <Text style={styles.sumLabelBold}>Total</Text>
              <Text style={styles.sumTotal}>₹{subtotal}</Text>
            </View>
            <Button
              title="Continue to address"
              onPress={() => navigation.navigate('Address')}
            />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  emptyBox: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  empty: {
    textAlign: 'center',
    marginBottom: spacing.lg,
    color: colors.textSecondary,
    fontSize: 16,
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
  },
  meta: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  price: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  qtyText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  qtyVal: {
    marginHorizontal: spacing.md,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  lineTotal: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  summary: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    ...shadows.card,
  },
  sumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sumLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  sumLabelBold: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  sumVal: {
    color: colors.text,
    fontSize: 14,
  },
  sumTotal: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '800',
  },
});
