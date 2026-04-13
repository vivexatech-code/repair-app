import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Header } from '../../components/Header';
import { Button } from '../../components/Button';
import { APP_NAME } from '../../constants';
import { colors } from '../../constants/colors';
import { radius, shadows, spacing } from '../../constants/spacing';

export function AboutModalScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Header title="About App" onBack={() => navigation.goBack()} />
      <View style={styles.body}>
        <View style={styles.card}>
          <Text style={styles.title}>{APP_NAME}</Text>
          <Text style={styles.version}>Version 1.0.0</Text>
          <Text style={styles.desc}>
            Repair Series is a modern home services platform for booking trusted
            technicians for repairs and maintenance.
          </Text>
        </View>
        <Button title="Close" onPress={() => navigation.goBack()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F8F8' },
  body: { flex: 1, padding: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.primary },
  version: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  desc: { fontSize: 15, lineHeight: 22, color: colors.textSecondary },
});
