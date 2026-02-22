/**
 * Nebula DNS - Admin UI Session Warning Modal
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Modal component that warns admin users before their session expires.
 * Allows them to either re-authenticate (opens login in new tab) or log out.
 */

'use client'

import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import {
  ClockIcon,
  ArrowRightOnRectangleIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline'

interface SessionWarningModalProps {
  /** Whether the modal is currently open */
  isOpen: boolean
  /** Callback when the modal should close */
  onClose: () => void
  /** Number of minutes remaining in the session */
  minutesRemaining: number
  /** Callback when user wants to stay logged in (opens login in new tab) */
  onStayLoggedIn: () => void
  /** Callback when user chooses to log out immediately */
  onLogout: () => void
}

/**
 * SessionWarningModal - Warns admin when session is about to expire
 *
 * Displays a modal with options to:
 * - "Stay Logged In" - Opens login page in new tab for re-authentication
 * - "Log Out Now" - Immediately logs out the user
 */
export function SessionWarningModal({
  isOpen,
  onClose,
  minutesRemaining,
  onStayLoggedIn,
  onLogout,
}: SessionWarningModalProps) {
  const handleStayLoggedIn = () => {
    onStayLoggedIn()
    onClose()
  }

  const handleLogout = () => {
    onClose()
    onLogout()
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-space-900/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-space-800 p-6 text-left align-middle shadow-xl transition-all ring-1 ring-space-900/5 dark:ring-white/10">
                {/* Warning Icon */}
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warning-100 dark:bg-warning-900/30">
                  <ClockIcon className="h-7 w-7 text-warning-600 dark:text-warning-400" />
                </div>

                {/* Title */}
                <Dialog.Title
                  as="h3"
                  className="mt-4 text-center text-lg font-semibold text-space-900 dark:text-white"
                >
                  Session Expiring Soon
                </Dialog.Title>

                {/* Message */}
                <div className="mt-2">
                  <p className="text-center text-sm text-space-600 dark:text-space-400">
                    Your session will expire in{' '}
                    <span className="font-semibold text-warning-600 dark:text-warning-400">
                      {minutesRemaining} minute{minutesRemaining !== 1 ? 's' : ''}
                    </span>
                    . Please save your work.
                  </p>
                </div>

                {/* Info Text */}
                <div className="mt-4 p-3 rounded-xl bg-space-50 dark:bg-space-900/50 border border-space-200 dark:border-space-700">
                  <p className="text-xs text-space-500 dark:text-space-400">
                    Click &quot;Stay Logged In&quot; to open the login page in a new tab.
                    After logging in, your current work will be preserved.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    className="flex-1 inline-flex justify-center items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 transition-colors"
                    onClick={handleStayLoggedIn}
                  >
                    <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                    Stay Logged In
                  </button>
                  <button
                    type="button"
                    className="flex-1 inline-flex justify-center items-center gap-2 rounded-xl bg-space-100 dark:bg-space-700 px-4 py-2.5 text-sm font-semibold text-danger-600 dark:text-danger-400 hover:bg-space-200 dark:hover:bg-space-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-danger-500 focus-visible:ring-offset-2 transition-colors"
                    onClick={handleLogout}
                  >
                    <ArrowRightOnRectangleIcon className="h-4 w-4" />
                    Log Out Now
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
