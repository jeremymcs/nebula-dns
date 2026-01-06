/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Add Family Member Modal
 */

'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { UserPlusIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'

interface AddFamilyMemberModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: { name: string; avatar: string; role: 'parent' | 'teen' | 'child' }) => Promise<void>
}

const AVATARS = ['👦', '👧', '👨', '👩', '🧑', '👴', '👵', '🧒', '👶', '🐶', '🐱', '🦊']

const ROLES: { value: 'parent' | 'teen' | 'child'; label: string; description: string }[] = [
  { value: 'parent', label: 'Parent', description: 'Full access, can manage family' },
  { value: 'teen', label: 'Teen', description: 'Moderate restrictions' },
  { value: 'child', label: 'Child', description: 'Strict safety filters' },
]

export function AddFamilyMemberModal({ isOpen, onClose, onSave }: AddFamilyMemberModalProps) {
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('👦')
  const [role, setRole] = useState<'parent' | 'teen' | 'child'>('child')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setName('')
      setAvatar('👦')
      setRole('child')
      setError(null)
    }
  }, [isOpen])

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Please enter a name')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await onSave({ name: name.trim(), avatar, role })
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to add family member')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Family Member"
      description="Add a new member to your family protection"
      size="md"
    >
      <div className="space-y-6">
        {/* Name Input */}
        <Input
          label="Name"
          placeholder="Enter name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={error && !name.trim() ? error : undefined}
        />

        {/* Avatar Selection */}
        <div>
          <label className="label">Avatar</label>
          <div className="flex flex-wrap gap-2">
            {AVATARS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAvatar(a)}
                className={clsx(
                  'w-12 h-12 text-2xl rounded-xl flex items-center justify-center transition-all',
                  avatar === a
                    ? 'bg-nebula-100 dark:bg-nebula-900/30 ring-2 ring-nebula-500 scale-110'
                    : 'bg-space-100 dark:bg-space-700 hover:bg-space-200 dark:hover:bg-space-600'
                )}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Role Selection */}
        <div>
          <label className="label">Role</label>
          <div className="space-y-2">
            {ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                className={clsx(
                  'w-full p-3 rounded-xl text-left transition-all flex items-center justify-between',
                  role === r.value
                    ? 'bg-nebula-100 dark:bg-nebula-900/30 ring-2 ring-nebula-500'
                    : 'bg-space-100 dark:bg-space-700 hover:bg-space-200 dark:hover:bg-space-600'
                )}
              >
                <div>
                  <p className="font-medium text-space-900 dark:text-white">{r.label}</p>
                  <p className="text-sm text-space-500">{r.description}</p>
                </div>
                <div
                  className={clsx(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                    role === r.value
                      ? 'border-nebula-500 bg-nebula-500'
                      : 'border-space-300 dark:border-space-600'
                  )}
                >
                  {role === r.value && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && name.trim() && (
          <div className="p-3 rounded-lg bg-danger-50 dark:bg-danger-900/20 text-danger-700 dark:text-danger-300 text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-space-200 dark:border-space-700">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            isLoading={isSubmitting}
            leftIcon={<UserPlusIcon className="h-4 w-4" />}
          >
            Add Member
          </Button>
        </div>
      </div>
    </Modal>
  )
}
