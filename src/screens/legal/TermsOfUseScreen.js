import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Header } from '../../components/Header';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';

export function TermsOfUseScreen() {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="Terms of Use" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.text}>
          These are sample terms for the demo app. Service timings, pricing,
          cancellation, and refund terms are controlled by your production
          policies.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F8F8' },
  body: { padding: spacing.lg },
  text: { fontSize: 15, lineHeight: 24, color: colors.textSecondary },
});
