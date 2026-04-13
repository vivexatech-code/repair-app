import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Header } from '../../components/Header';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';

export function PrivacyPolicyScreen() {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="Privacy Policy" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.text}>
          This is a demo privacy policy page. In production, explain what user
          data is collected, how it is used, retention, and deletion process.
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
