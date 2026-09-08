import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

import { Button } from '../../components/Button';
import { InputField } from '../../components/InputField';
import { PhoneRecaptchaVerifier } from '../../components/PhoneRecaptchaVerifier';
import { colors } from '../../constants/colors';
import { spacing, radius } from '../../constants/spacing';
import { APP_NAME } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { useGuestBrowse } from '../../context/GuestBrowseContext';
import {
  OTP_LENGTH,
  OTP_RESEND_COOLDOWN_SEC,
  formatNationalInput,
  parseIndiaMobile,
} from '../../utils/phone';
import { mapPhoneAuthError } from '../../utils/phoneAuthErrors';
import {
  clearPhoneConfirmation,
  confirmCustomerOtp,
  resolveCustomerIdentity,
  sendCustomerOtp,
} from '../../services/phoneAuthService';
import { useResponsive } from '../../utils/layout';

export function LoginScreen() {
  const { enterGuestBrowse } = useGuestBrowse();
  const { beginIdentityResolution, endIdentityResolution } = useAuth();
  const { width, height } = useWindowDimensions();
  const { isWeb } = useResponsive();
  const otpBoxSize = Math.max(36, Math.min(52, Math.floor((Math.min(width, 480) - 72) / 6)));
  const recaptchaRef = useRef(null);
  const otpRefs = useRef([]);
  const sendingRef = useRef(false);

  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [otpDigits, setOtpDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const otp = otpDigits.join('');

  const sendOtp = async () => {
    if (sendingRef.current) return;
    setError('');
    const parsed = parseIndiaMobile(phone);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    sendingRef.current = true;
    setLoading(true);
    try {
      await sendCustomerOtp(parsed.national, recaptchaRef.current);
      setStep('otp');
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setCooldown(OTP_RESEND_COOLDOWN_SEC);
    } catch (err) {
      setError(mapPhoneAuthError(err));
    } finally {
      sendingRef.current = false;
      setLoading(false);
    }
  };

  const onVerify = async () => {
    if (sendingRef.current) return;
    setError('');
    if (otp.length !== OTP_LENGTH) {
      setError('Enter the 6-digit OTP.');
      return;
    }
    sendingRef.current = true;
    setLoading(true);
    beginIdentityResolution();
    try {
      await confirmCustomerOtp(otp);
      await resolveCustomerIdentity(name);
    } catch (err) {
      setError(mapPhoneAuthError(err));
    } finally {
      endIdentityResolution();
      sendingRef.current = false;
      setLoading(false);
    }
  };

  const onChangeOtp = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otpDigits];
    if (value.length > 1) {
      const pasted = value.replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
      for (let i = 0; i < OTP_LENGTH; i += 1) next[i] = pasted[i] || '';
      setOtpDigits(next);
      const focusAt = Math.min(pasted.length, OTP_LENGTH - 1);
      otpRefs.current[focusAt]?.focus();
      return;
    }
    next[index] = digit;
    setOtpDigits(next);
    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const translateY = enter.interpolate({
    inputRange: [0, 1],
    outputRange: [28, 0],
  });

  return (
    <View style={styles.root}>
      <PhoneRecaptchaVerifier ref={recaptchaRef} />
      <LinearGradient
        colors={['#C45508', '#E07A35', '#F8F6F4']}
        locations={[0, 0.28, 0.55]}
        style={[styles.hero, { height: Math.min(320, height * 0.42) }]}
      />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={[styles.scroll, isWeb && styles.scrollWeb]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={[styles.headerContainer, { opacity: enter, transform: [{ translateY }] }]}
            >
              <View style={styles.iconWrapper}>
                <Image
                  source={require('../../../assets/icon.png')}
                  style={styles.appIcon}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.brand}>{APP_NAME}</Text>
              <Text style={styles.title}>
                {step === 'phone' ? 'Welcome' : 'Verify OTP'}
              </Text>
              <Text style={styles.sub}>
                {step === 'phone'
                  ? 'Enter your mobile number to continue'
                  : `Enter the 6-digit code sent to +91 ${formatNationalInput(phone)}`}
              </Text>
            </Animated.View>

            <Animated.View
              style={[styles.card, { opacity: enter, transform: [{ translateY }] }]}
            >
              {step === 'phone' ? (
                <>
                  <Text style={styles.label}>Mobile number</Text>
                  <View style={styles.phoneRow}>
                    <Text style={styles.dial}>+91</Text>
                    <TextInput
                      value={phone}
                      onChangeText={(v) => setPhone(formatNationalInput(v))}
                      placeholder="9876543210"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="phone-pad"
                      maxLength={10}
                      style={styles.phoneInput}
                    />
                  </View>
                  <InputField
                    label="Your name (new customers)"
                    value={name}
                    onChangeText={setName}
                    placeholder="Optional"
                    autoCapitalize="words"
                  />
                  {Platform.OS === 'web' ? (
                    <View nativeID="rs-phone-recaptcha" style={styles.recaptchaHost} />
                  ) : null}
                </>
              ) : (
                <View style={styles.otpRow}>
                  {otpDigits.map((digit, index) => (
                    <TextInput
                      key={`otp-${index}`}
                      ref={(node) => {
                        otpRefs.current[index] = node;
                      }}
                      value={digit}
                      onChangeText={(v) => onChangeOtp(index, v)}
                      onKeyPress={({ nativeEvent }) => {
                        if (nativeEvent.key === 'Backspace' && !otpDigits[index] && index > 0) {
                          otpRefs.current[index - 1]?.focus();
                        }
                      }}
                      keyboardType="number-pad"
                      maxLength={index === 0 ? OTP_LENGTH : 1}
                      style={[styles.otpBox, { width: otpBoxSize, height: otpBoxSize + 8 }]}
                    />
                  ))}
                </View>
              )}

              {error ? (
                <View style={styles.errorBox}>
                  <MaterialIcons name="error-outline" size={18} color={colors.error} />
                  <Text style={styles.errText}>{error}</Text>
                </View>
              ) : null}

              <Button
                title={
                  step === 'phone'
                    ? loading
                      ? 'Sending OTP...'
                      : 'Continue'
                    : loading
                      ? 'Verifying OTP...'
                      : 'Verify & continue'
                }
                onPress={step === 'phone' ? sendOtp : onVerify}
                loading={loading}
                style={styles.submitBtn}
              />

              {step === 'otp' ? (
                <View style={styles.otpActions}>
                  <Pressable
                    onPress={() => {
                      setStep('phone');
                      setOtpDigits(Array(OTP_LENGTH).fill(''));
                      setError('');
                      clearPhoneConfirmation();
                    }}
                    hitSlop={8}
                  >
                    <Text style={styles.changeText}>Change number</Text>
                  </Pressable>
                  <Pressable
                    onPress={sendOtp}
                    disabled={loading || cooldown > 0}
                    hitSlop={8}
                  >
                    <Text style={[styles.resendText, cooldown > 0 && styles.disabledText]}>
                      {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <Button
                title="Browse as Guest"
                variant="outline"
                onPress={async () => {
                  try {
                    await enterGuestBrowse();
                  } catch {
                    /* guest mode persistence is best-effort */
                  }
                }}
                style={styles.skipBtn}
              />
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  hero: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  scrollWeb: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingVertical: spacing.xl,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingTop: spacing.md,
  },
  iconWrapper: {
    width: 84,
    height: 84,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    marginBottom: 14,
  },
  appIcon: { width: 84, height: 84, borderRadius: 22 },
  brand: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
  },
  sub: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  dial: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontWeight: '800',
    color: colors.text,
    backgroundColor: '#F8F6F4',
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: 6,
    flexWrap: 'nowrap',
  },
  otpBox: {
    flexGrow: 1,
    maxWidth: 52,
    minWidth: 36,
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  otpActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  changeText: { color: colors.textSecondary, fontWeight: '700' },
  resendText: { color: colors.primary, fontWeight: '800' },
  disabledText: { opacity: 0.5 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.error}10`,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.error}30`,
  },
  errText: { color: colors.error, marginLeft: spacing.sm, fontSize: 14, flex: 1 },
  submitBtn: { marginBottom: spacing.md },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: {
    marginHorizontal: spacing.md,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  skipBtn: { marginBottom: spacing.sm },
  recaptchaHost: { minHeight: 78, marginBottom: spacing.md, alignItems: 'center' },
});
