'use client';

import { useEffect, useState } from 'react';
import { Card, Button, Input } from '@/components/ui';
import { API_URL } from '@/lib/api';

async function adminRequest<T>(
  endpoint: string,
  init: RequestInit = {},
): Promise<T> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }
  return res.json();
}

export default function PlatformBlockPageSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: 'Access Blocked',
    message: '',
    primaryColor: '#1E3B78',
    secondaryColor: '#4B7CBB',
    accentColor: '#FF6E62',
    footerText: 'Powered by Flux Labs',
  });

  useEffect(() => {
    adminRequest<{ data: typeof form }>('/admin/platform/block-page')
      .then((res) => setForm((prev) => ({ ...prev, ...res.data })))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await adminRequest('/admin/platform/block-page', {
        method: 'PATCH',
        body: JSON.stringify(form),
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <p className="text-muted-foreground p-6">Loading platform block page…</p>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold text-[#4B7CBB]">Platform block page</h1>
      <p className="text-sm text-muted-foreground">
        Default Flux Shield branding for sinkholed HTTP responses.
      </p>
      <Card className="space-y-4 p-6">
        <Input
          label="Headline"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <Input
          label="Primary color"
          value={form.primaryColor}
          onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
        />
        <Input
          label="Message"
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
        />
        <Button onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save platform default'}
        </Button>
      </Card>
    </div>
  );
}
