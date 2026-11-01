/**
 * Nebula DNS - Invite Admin Modal Component
 * Modal for inviting new admin users with role selection
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/Toast'
import { inviteAdmin } from '@/hooks/useApi'
import { inviteAdminSchema, type InviteAdminFormData } from '@/lib/validations/admin-invite.schema'

interface InviteAdminModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const ROLE_OPTIONS = [
  {
    value: 'viewer',
    label: 'Viewer',
    description: 'Read-only access to dashboards and MSPs',
  },
  {
    value: 'admin',
    label: 'Admin',
    description: 'Full access except user management',
  },
  {
    value: 'super_admin',
    label: 'Super Admin',
    description: 'Full access including user management',
  },
] as const

export function InviteAdminModal({ isOpen, onClose, onSuccess }: InviteAdminModalProps) {
  const { showToast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteAdminFormData>({
    resolver: zodResolver(inviteAdminSchema),
    defaultValues: {
      email: '',
      role: 'admin',
    },
  })

  const handleClose = () => {
    reset()
    setError(null)
    onClose()
  }

  const onSubmit = async (data: InviteAdminFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const result = await inviteAdmin(data)
      if (result.emailSent) {
        showToast('success', 'Invitation Sent', `An invitation has been sent to ${data.email}`)
      } else {
        showToast(
          'warning',
          'Invite created — email not sent',
          result.inviteUrl
            ? 'Copy the invite link and share it securely with the new admin.'
            : 'SendGrid is not configured; share the invite manually.',
        )
        if (result.inviteUrl && typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(result.inviteUrl)
        }
      }
      reset()
      onSuccess()
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send invitation'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Invite Admin"
      description="Send an invitation to a new administrator"
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* API Error Display */}
        {error && (
          <div className="p-3 rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800">
            <p className="text-sm text-danger-700 dark:text-danger-300">{error}</p>
          </div>
        )}

        {/* Email Input */}
        <Input
          label="Email Address"
          type="email"
          placeholder="admin@example.com"
          error={errors.email?.message}
          disabled={isSubmitting}
          {...register('email')}
        />

        {/* Role Select */}
        <div className="w-full">
          <label htmlFor="role" className="label">
            Role
          </label>
          <select
            id="role"
            className={`select ${errors.role ? 'input-error' : ''}`}
            disabled={isSubmitting}
            {...register('role')}
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.role && (
            <p className="mt-1.5 text-sm text-danger-600 dark:text-danger-400">
              {errors.role.message}
            </p>
          )}

          {/* Role Descriptions */}
          <div className="mt-3 space-y-2">
            {ROLE_OPTIONS.map((option) => (
              <div
                key={option.value}
                className="flex items-start gap-2 text-sm text-space-500 dark:text-space-400"
              >
                <span className="font-medium text-space-700 dark:text-space-300 min-w-[90px]">
                  {option.label}:
                </span>
                <span>{option.description}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            Send Invitation
          </Button>
        </div>
      </form>
    </Modal>
  )
}
