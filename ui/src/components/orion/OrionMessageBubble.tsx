/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Orion Message Bubble - Individual message component in chat
 */

'use client'

import { motion } from 'framer-motion'
import clsx from 'clsx'
import { OrionMessage, OrionAction } from './types'
import { SparklesIcon, UserIcon } from '@heroicons/react/24/solid'

interface OrionMessageBubbleProps {
  message: OrionMessage
  onAction?: (action: OrionAction) => void
}

export function OrionMessageBubble({ message, onAction }: OrionMessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx('flex gap-3', isUser && 'flex-row-reverse')}
    >
      {/* Avatar */}
      <div
        className={clsx(
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
          isUser
            ? 'bg-space-200 dark:bg-space-700'
            : 'bg-gradient-to-br from-nebula-500 to-nebula-600'
        )}
      >
        {isUser ? (
          <UserIcon className="h-4 w-4 text-space-600 dark:text-space-300" />
        ) : (
          <SparklesIcon className="h-4 w-4 text-white" />
        )}
      </div>

      {/* Content */}
      <div className={clsx('flex-1 max-w-[80%]', isUser && 'flex flex-col items-end')}>
        <div
          className={clsx(
            'px-4 py-2 rounded-2xl',
            isUser
              ? 'bg-nebula-500 text-white rounded-tr-sm'
              : 'bg-space-100 dark:bg-space-800 text-space-900 dark:text-white rounded-tl-sm'
          )}
        >
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Actions */}
        {message.actions && message.actions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.actions.map((action) => (
              <button
                key={action.id}
                onClick={() => onAction?.(action)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-nebula-500/10 text-nebula-600 dark:text-nebula-400 hover:bg-nebula-500/20 transition-colors border border-nebula-500/20"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <p className={clsx('text-xs text-space-400 mt-1', isUser && 'text-right')}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </motion.div>
  )
}

