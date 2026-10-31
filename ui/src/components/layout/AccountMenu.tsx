/**
 * Nebula DNS - Account Menu (portaled dropdown for reliable mobile Safari touch)
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import clsx from 'clsx'
import {
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'

type NavItem = {
  name: string
  href: string
  icon: ComponentType<{ className?: string }>
}

type AccountMenuProps = {
  userName?: string | null
  userEmail?: string | null
  adminNavigation: NavItem[]
  onLogout: () => void
  getInitials: (name: string) => string
}

const PANEL_WIDTH = 224

export function AccountMenu({
  userName,
  userEmail,
  adminNavigation,
  onLogout,
  getInitials,
}: AccountMenuProps) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    setMounted(true)
  }, [])

  const updatePosition = useCallback(() => {
    const button = buttonRef.current
    if (!button) return
    const rect = button.getBoundingClientRect()
    setPosition({
      top: rect.bottom + 8,
      left: Math.max(8, rect.right - PANEL_WIDTH),
    })
  }, [])

  useEffect(() => {
    if (!open) return
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, updatePosition])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return
      }
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  const panel = open && mounted ? (
    <div
      ref={panelRef}
      role="menu"
      aria-label="Account menu"
      className="fixed z-[100] w-56 origin-top-right rounded-xl bg-white dark:bg-space-800 shadow-lg ring-1 ring-space-900/5 dark:ring-white/10 p-1 touch-manipulation"
      style={{ top: position.top, left: position.left }}
    >
      <div className="px-3 py-2 border-b border-space-100 dark:border-space-700">
        <p className="text-sm font-medium text-space-900 dark:text-white">{userName}</p>
        <p className="text-xs text-space-500 dark:text-space-400 truncate">{userEmail}</p>
      </div>

      {adminNavigation.map((item) => (
        <Link
          key={item.name}
          href={item.href}
          role="menuitem"
          onClick={() => setOpen(false)}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-space-700 dark:text-space-300 hover:bg-space-100 dark:hover:bg-space-700"
        >
          <item.icon className="h-4 w-4" />
          {item.name}
        </Link>
      ))}

      <div className="border-t border-space-100 dark:border-space-700 mt-1 pt-1">
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            setOpen(false)
            onLogout()
          }}
          className="flex w-full items-center gap-2 px-3 py-2 text-sm rounded-lg text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/20"
        >
          <ArrowRightOnRectangleIcon className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  ) : null

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => {
          setOpen((value) => !value)
          if (!open) {
            requestAnimationFrame(updatePosition)
          }
        }}
        className={clsx(
          'flex items-center gap-2 p-1.5 pr-3 rounded-xl hover:bg-space-100 dark:hover:bg-space-800 transition-colors touch-manipulation',
          open && 'bg-space-100 dark:bg-space-800',
        )}
      >
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
          <span className="text-xs font-bold text-white">
            {userName ? getInitials(userName) : 'U'}
          </span>
        </div>
        <span className="hidden sm:block text-sm font-medium text-space-700 dark:text-space-300">
          {userName?.split(' ')[0] || 'User'}
        </span>
        <ChevronDownIcon className="h-4 w-4 text-space-400" />
      </button>
      {mounted && panel ? createPortal(panel, document.body) : null}
    </>
  )
}
