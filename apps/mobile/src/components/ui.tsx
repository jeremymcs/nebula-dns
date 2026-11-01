import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from 'react-native';
import { useColorScheme } from 'react-native';
import { getTheme } from '../theme/colors';

interface ScreenProps {
  children: React.ReactNode;
  title?: string;
  footer?: boolean;
  style?: ViewStyle;
}

export function Screen({ children, title, footer, style }: ScreenProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = getTheme(scheme);
  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }, style]}
      accessibilityLabel={title ? `${title} screen` : 'screen'}
    >
      {title ? (
        <Text style={[styles.title, { color: theme.colors.text }]} accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      {children}
      {footer ? (
        <Text style={[styles.footer, { color: theme.colors.textMuted }]}>
          Powered by Flux Labs
        </Text>
      ) : null}
    </View>
  );
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
}

export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  accessibilityLabel,
}: ButtonProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = getTheme(scheme);
  const bg =
    variant === 'danger'
      ? theme.colors.accent
      : variant === 'secondary'
        ? theme.colors.surface
        : theme.colors.primary;
  const color =
    variant === 'secondary' ? theme.colors.primary : theme.colors.background;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bg,
          borderColor: theme.colors.primary,
          borderWidth: variant === 'secondary' ? 1 : 0,
          opacity: pressed || disabled ? 0.7 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text style={[styles.buttonText, { color: variant === 'secondary' ? theme.colors.primary : '#fff' }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function EmptyState({ message }: { message: string }) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = getTheme(scheme);
  return (
    <View style={styles.empty} accessibilityLabel={message}>
      <Text style={{ color: theme.colors.textMuted, textAlign: 'center' }}>
        {message}
      </Text>
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <EmptyState message={message} />
      {onRetry ? <PrimaryButton label="Retry" onPress={onRetry} /> : null}
    </View>
  );
}

export function ImpersonationBanner({
  tenantName,
  onEnd,
}: {
  tenantName: string;
  onEnd: () => void;
}) {
  return (
    <View style={styles.banner} accessibilityLabel={`Impersonating ${tenantName}`}>
      <Text style={styles.bannerText}>Impersonating: {tenantName}</Text>
      <Pressable onPress={onEnd} accessibilityRole="button" accessibilityLabel="End impersonation">
        <Text style={styles.bannerAction}>End</Text>
      </Pressable>
    </View>
  );
}

export function SearchField({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
}) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = getTheme(scheme);
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.textMuted}
      accessibilityLabel={placeholder}
      style={[
        styles.input,
        {
          color: theme.colors.text,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 12 },
  footer: { marginTop: 'auto', textAlign: 'center', fontSize: 12, paddingVertical: 8 },
  button: {
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginVertical: 6,
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
  empty: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  banner: {
    backgroundColor: '#FF6E62',
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerText: { color: '#fff', fontWeight: '600', flex: 1 },
  bannerAction: { color: '#fff', fontWeight: '700', textDecorationLine: 'underline' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
});
