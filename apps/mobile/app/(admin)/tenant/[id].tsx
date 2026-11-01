import { useState } from 'react';
import { Alert, Text, TextInput, useColorScheme } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Screen, PrimaryButton } from '@/src/components/ui';
import { useAuth } from '@/src/context/AuthContext';
import { getTheme } from '@/src/theme/colors';
import {
  canImpersonate,
  canPerformWrite,
} from '@/src/types/auth';
import {
  getAccessToken,
  saveAdminTokenForAfterImpersonation,
  setImpersonation,
} from '@/src/auth/session';

export default function TenantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, admin, compromised, reloadProfile } = useAuth();
  const [reason, setReason] = useState('');
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = getTheme(scheme);
  const canWrite = canPerformWrite(admin?.role, compromised);

  const detail = useQuery({
    queryKey: ['admin', 'tenant', id],
    queryFn: () => api.get<Record<string, unknown>>(`/admin/tenants/${id}`),
    retry: false,
  });

  const suspend = async () => {
    if (!canWrite) {
      Alert.alert('Read-only', 'Action blocked on this device or role.');
      return;
    }
    await api.post(`/admin/tenants/${id}/suspend`);
    await detail.refetch();
  };

  const reactivate = async () => {
    if (!canWrite) {
      return;
    }
    await api.post(`/admin/tenants/${id}/reactivate`);
    await detail.refetch();
  };

  const impersonate = async () => {
    if (!canImpersonate(admin?.role)) {
      Alert.alert('Not allowed', 'Viewers cannot impersonate.');
      return;
    }
    if (reason.trim().length < 3) {
      Alert.alert('Reason required', 'Enter an audit reason (3+ characters).');
      return;
    }
    const adminToken = await getAccessToken();
    if (adminToken) {
      await saveAdminTokenForAfterImpersonation(adminToken);
    }
    const res = await api.post<{
      accessToken: string;
      tenantId: string;
      tenantName: string;
    }>(`/admin/impersonate/${id}`, { reason: reason.trim() });
    await setImpersonation({
      active: true,
      tenantId: id,
      tenantName: res.tenantName ?? id,
      token: res.accessToken,
      reason: reason.trim(),
      startedAt: new Date().toISOString(),
    });
    await reloadProfile();
    Alert.alert('Impersonating', res.tenantName ?? id);
  };

  return (
    <Screen title="Tenant">
      <Text style={{ color: theme.colors.textMuted, marginBottom: 8 }}>
        {detail.isError
          ? 'Detail API requires PR #21'
          : detail.isLoading
            ? 'Loading…'
            : JSON.stringify(detail.data, null, 2)}
      </Text>
      <PrimaryButton label="Suspend" onPress={suspend} disabled={!canWrite} />
      <PrimaryButton
        label="Reactivate"
        variant="secondary"
        onPress={reactivate}
        disabled={!canWrite}
      />
      <TextInput
        value={reason}
        onChangeText={setReason}
        placeholder="Impersonation reason"
        placeholderTextColor={theme.colors.textMuted}
        accessibilityLabel="Impersonation reason"
        style={{
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: 10,
          padding: 12,
          color: theme.colors.text,
          marginVertical: 8,
        }}
      />
      <PrimaryButton
        label="Impersonate tenant"
        variant="danger"
        onPress={impersonate}
        disabled={!canImpersonate(admin?.role)}
      />
    </Screen>
  );
}
