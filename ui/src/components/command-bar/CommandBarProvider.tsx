/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Command Bar Provider - Global keyboard shortcut handler and state management
 */

'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { CommandBar } from './CommandBar'

interface CommandBarContextType {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

const CommandBarContext = createContext<CommandBarContextType | null>(null)

export function useCommandBar() {
  const context = useContext(CommandBarContext)
  if (!context) {
    throw new Error('useCommandBar must be used within CommandBarProvider')
  }
  return context
}

interface CommandBarProviderProps {
  children: ReactNode
}

export function CommandBarProvider({ children }: CommandBarProviderProps) {
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])

  // Global keyboard shortcut handler
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // ⌘K or Ctrl+K to open command bar
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        toggle()
        return
      }

      // Escape to close
      if (event.key === 'Escape' && isOpen) {
        event.preventDefault()
        close()
        return
      }

      // Vim-style navigation shortcuts when command bar is closed
      if (!isOpen && !event.metaKey && !event.ctrlKey && !event.altKey) {
        // Only trigger if not in an input/textarea
        const target = event.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return
        }

        // G + key for navigation (handled by useKeyboardNavigation)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, toggle, close])

  return (
    <CommandBarContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
      <CommandBar isOpen={isOpen} onClose={close} />
    </CommandBarContext.Provider>
  )
}

