'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AuthShell, AuthHeadingAccent } from '@/components/auth/AuthShell'
import { SignupForm } from '@/components/auth/SignupForm'
import { API_URL } from '@/lib/api'
import type { SignupFormData } from '@/lib/validations'

export default function SignupPage() {
  const router = useRouter()

  const handleSignup = async (data: SignupFormData) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: data.email,
        password: data.password,
        name: data.fullName,
        companyName: data.companyName,
        planId: data.planId,
        billingCycle: data.billingCycle,
      }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.message || 'Registration failed')
    }
    router.push('/')
  }

  return (
    <AuthShell
      eyebrow="Get started"
      maxWidth="md"
      title={
        <>
          Start your <AuthHeadingAccent>trial</AuthHeadingAccent>
        </>
      }
      subtitle="Create your workspace in minutes. No credit card required on the free plan."
      footer={
        <p className="text-center text-sm text-mut">
          Already have an account?{' '}
          <Link href="/" className="font-medium text-[var(--fs-blue)] hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <SignupForm onSubmit={handleSignup} />
    </AuthShell>
  )
}
