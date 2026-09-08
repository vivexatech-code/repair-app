import React from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Header } from "../../components/Header";
import { colors } from "../../constants/colors";
import { spacing } from "../../constants/spacing";
import { useAppSettings } from "../../context/AppSettingsContext";
import { formatLegalUpdatedAt } from "../../services/appSettingsService";

const FALLBACK_TERMS = `By using Repair Series, you agree to follow our terms of service. The app connects you with partners for home services, and all bookings are subject to availability and confirmation. You are responsible for providing accurate information, including your address and contact details, to ensure smooth service delivery. Pricing and service timelines may vary depending on the service and location. Cancellations and refunds, if applicable, will be handled as per our policies. Repair Series acts as a platform between users and partners and is not directly responsible for service execution. Continued use of the app indicates your acceptance of these terms.`;

export function TermsOfUseScreen() {
  const navigation = useNavigation();
  const { customerTerms, customerTermsUpdatedAt, updatedAt } = useAppSettings();
  const body = (customerTerms && customerTerms.trim()) || FALLBACK_TERMS;
  const updatedLabel = formatLegalUpdatedAt(customerTermsUpdatedAt || updatedAt);

  return (
    <>
      <Header title="Terms of Use" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>Terms & Conditions</Text>
        {updatedLabel ? (
          <Text style={styles.updated}>Updated at: {updatedLabel}</Text>
        ) : null}
        <Text style={styles.text}>{body}</Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.lg },
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
  text: { fontSize: 15, lineHeight: 24, color: colors.textSecondary },
});
