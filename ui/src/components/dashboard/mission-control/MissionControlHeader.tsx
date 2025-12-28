/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Mission Control Header - Cosmic themed header with animated background
 */

'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import { useTheme } from '@/contexts/ThemeContext'

interface MissionControlHeaderProps {
  title?: string
  subtitle?: string
  className?: string
}

export function MissionControlHeader({
  title = 'Mission Control',
  subtitle = 'Real-time network security monitoring',
  className,
}: MissionControlHeaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { resolvedTheme } = useTheme()

  // Particle animation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Stars
    const stars: { x: number; y: number; size: number; speed: number; opacity: number }[] = []
    for (let i = 0; i < 100; i++) {
      stars.push({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        size: Math.random() * 2,
        speed: 0.1 + Math.random() * 0.3,
        opacity: 0.3 + Math.random() * 0.7,
      })
    }

    let animationId: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)

      // Draw stars - use different colors for light/dark themes
      const isDark = resolvedTheme === 'dark'
      stars.forEach((star) => {
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
        // Purple for dark mode, nebula blue for light mode
        ctx.fillStyle = isDark
          ? `rgba(139, 92, 246, ${star.opacity})`
          : `rgba(99, 102, 241, ${star.opacity * 0.7})`
        ctx.fill()

        // Twinkle
        star.opacity += (Math.random() - 0.5) * 0.05
        star.opacity = Math.max(0.2, Math.min(1, star.opacity))

        // Slow drift
        star.y += star.speed
        if (star.y > canvas.offsetHeight) {
          star.y = 0
          star.x = Math.random() * canvas.offsetWidth
        }
      })

      animationId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      cancelAnimationFrame(animationId)
    }
  }, [resolvedTheme])

  return (
    <div className={clsx('relative overflow-hidden rounded-2xl', className)}>
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-nebula-100 via-indigo-100/50 to-space-100 dark:from-space-900 dark:via-nebula-900/50 dark:to-space-950" />

      {/* Animated particles */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full opacity-40 dark:opacity-60"
      />

      {/* Gradient orbs */}
      <motion.div
        className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-nebula-400/20 dark:bg-nebula-500/20 blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-cyan-400/20 dark:bg-cyan-500/20 blur-3xl"
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 6, repeat: Infinity }}
      />

      {/* Content */}
      <div className="relative px-8 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold text-space-900 dark:text-white mb-2">{title}</h1>
          <p className="text-space-600 dark:text-nebula-200/80">{subtitle}</p>
        </motion.div>

        {/* Status indicators */}
        <div className="mt-6 flex items-center gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400 animate-pulse" />
            <span className="text-sm text-green-700 dark:text-green-300">All Systems Operational</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="text-sm text-space-500 dark:text-nebula-300/60"
          >
            Last updated: {new Date().toLocaleTimeString()}
          </motion.div>
        </div>
      </div>
    </div>
  )
}

