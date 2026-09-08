import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../constants/colors';
import { radius, spacing } from '../constants/spacing';
import { typography } from '../constants/typography';

export function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  multiline,
  error,
  style,
  inputStyle,
  rightAdornment,
  ...rest
}) {
  return (
    <View style={[styles.wrap, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputWrap}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          accessibilityLabel={label || placeholder}
          accessibilityHint={error || undefined}
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            error && styles.inputError,
            rightAdornment && styles.inputWithAdornment,
            inputStyle,
          ]}
          {...rest}
        />
        {rightAdornment ? <View style={styles.adornment}>{rightAdornment}</View> : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputWithAdornment: {
    paddingRight: 44,
  },
  adornment: {
    position: 'absolute',
    right: 12,
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: colors.error,
  },
  error: {
    marginTop: spacing.xs,
    ...typography.caption,
    color: colors.error,
  },
});
