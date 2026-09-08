import React from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Header } from "../../components/Header";
import { colors } from "../../constants/colors";
import { spacing } from "../../constants/spacing";
import { useAppSettings } from "../../context/AppSettingsContext";
import { formatLegalUpdatedAt } from "../../services/appSettingsService";

const FALLBACK_PRIVACY = `At Repair Series, we are committed to protecting your privacy and ensuring that your personal information is handled in a safe and responsible manner. This Privacy Policy explains how we collect, use, and protect your information when you use our application and services.

We may collect personal information such as your name, phone number, email address, and service address. Location may be used to provide home services and assign a nearby partner.

We do not sell your personal data. Information may be shared with assigned partners to fulfill a booking, with trusted infrastructure providers, or when required by law.`;

export function PrivacyPolicyScreen() {
  const navigation = useNavigation();
  const { customerPrivacyPolicy, customerPrivacyUpdatedAt, updatedAt } = useAppSettings();
  const body = (customerPrivacyPolicy && customerPrivacyPolicy.trim()) || FALLBACK_PRIVACY;
  const updatedLabel = formatLegalUpdatedAt(customerPrivacyUpdatedAt || updatedAt);

  return (
    <>
      <Header title="Privacy Policy" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>Privacy Policy – Repair Series</Text>
        {updatedLabel ? (
          <Text style={styles.updated}>Updated at: {updatedLabel}</Text>
        ) : null}
        <Text style={styles.text}>{body}</Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  body: {
    padding: spacing.lg,
    paddingBottom: spacing.lg * 2,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.textPrimary || "#333",
    marginBottom: 8,
  },
  updated: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  text: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.textSecondary,
  },
});
