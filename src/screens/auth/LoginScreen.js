import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { InputField } from '../../components/InputField';
import { colors } from '../../constants/colors';
import { spacing, radius } from '../../constants/spacing';
import { APP_NAME } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import {
  EmailNotVerifiedError,
  signInUnverifiedAndResendVerification,
} from '../../services/authService';

export function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async () => {
    setError('');
    setVerifyMessage(false);
    if (!email.trim() || !password) {
      setError('Enter email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      if (e instanceof EmailNotVerifiedError) {
        setVerifyMessage(true);
      } else {
        setError(e?.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Enter your email and password to resend verification.');
      return;
    }
    setResendLoading(true);
    try {
      const result = await signInUnverifiedAndResendVerification(
        email.trim(),
        password,
      );
      if (result.verified) {
        Alert.alert('Verified', 'Your email is verified. Please sign in again.');
        setVerifyMessage(false);
      } else {
        Alert.alert('Sent', 'Verification email sent. Check your inbox.');
      }
    } catch (e) {
      setError(e?.message || 'Could not resend email');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.brand}>{APP_NAME}</Text>
          <Text style={styles.sub}>Sign in to book trusted home services</Text>

          <InputField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <InputField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
          />
          {error ? <Text style={styles.err}>{error}</Text> : null}
          {verifyMessage ? (
            <View style={styles.verifyBox}>
              <Text style={styles.verifyText}>Please verify your email</Text>
              <Button
                title="Resend Email"
                onPress={onResend}
                loading={resendLoading}
                variant="outline"
                style={styles.resendBtn}
              />
            </View>
          ) : null}

          <Button title="Sign In" onPress={onSubmit} loading={loading} />

          <Button
            title="Create account"
            variant="ghost"
            onPress={() => navigation.navigate('Signup')}
            style={styles.linkBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    padding: spacing.lg,
    paddingTop: spacing.xl * 1.5,
  },
  brand: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  sub: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  err: {
    color: colors.error,
    marginBottom: spacing.md,
  },
  verifyBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  verifyText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  resendBtn: {
    marginTop: spacing.xs,
  },
  linkBtn: {
    marginTop: spacing.md,
  },
});
