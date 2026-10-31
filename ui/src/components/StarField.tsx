/**
 * Nebula DNS - Animated Star Field Background
 * Cosmic Security Theme
 */

'use client'

import { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  size: number
  opacity: number
  speed: number
}

export function StarField({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const starsRef = useRef<Star[]>([])
  const animationRef = useRef<number>()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      initStars()
    }

    const initStars = () => {
      const stars: Star[] = []
      const numStars = Math.floor((canvas.width * canvas.height) / 8000)
      
      for (let i = 0; i < numStars; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2 + 0.5,
          opacity: Math.random() * 0.5 + 0.3,
          speed: Math.random() * 0.02 + 0.005,
        })
      }
      starsRef.current = stars
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      starsRef.current.forEach((star) => {
        // Twinkle effect
        star.opacity += Math.sin(Date.now() * star.speed) * 0.01
        star.opacity = Math.max(0.1, Math.min(0.8, star.opacity))
        
        // Draw star with glow
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`
        ctx.fill()
        
        // Add glow to larger stars
        if (star.size > 1.2) {
          ctx.beginPath()
          ctx.arc(star.x, star.y, star.size * 2, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(75, 124, 187, ${star.opacity * 0.25})`
          ctx.fill()
        }
      })
      
      animationRef.current = requestAnimationFrame(animate)
    }

    resizeCanvas()
    animate()

    window.addEventListener('resize', resizeCanvas)
    
    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none ${className}`}
      style={{ zIndex: 0 }}
    />
  )
}

// Simplified CSS-only star field for better performance
export function CSSStarField({ className = '' }: { className?: string }) {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-space-950 via-primary-950 to-[#0c1424]" />
      
      {/* Nebula glow */}
      <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary-600/25 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-accent-500/20 rounded-full blur-[100px]" />
      
      {/* Static stars using pseudo-elements and gradients */}
      <div className="absolute inset-0 opacity-60" 
        style={{
          backgroundImage: `
            radial-gradient(2px 2px at 20px 30px, white, transparent),
            radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.8), transparent),
            radial-gradient(1px 1px at 90px 40px, white, transparent),
            radial-gradient(2px 2px at 130px 80px, rgba(255,255,255,0.6), transparent),
            radial-gradient(1px 1px at 160px 120px, white, transparent),
            radial-gradient(1.5px 1.5px at 200px 50px, rgba(255,255,255,0.7), transparent),
            radial-gradient(2px 2px at 250px 150px, white, transparent),
            radial-gradient(1px 1px at 300px 100px, rgba(255,255,255,0.5), transparent)
          `,
          backgroundSize: '400px 200px',
        }}
      />
      
      {/* Animated floating particles */}
      <div className="absolute w-2 h-2 bg-primary-400/50 rounded-full blur-sm animate-float" style={{ top: '20%', left: '10%' }} />
      <div className="absolute w-1.5 h-1.5 bg-accent-400/40 rounded-full blur-sm animate-float" style={{ top: '60%', left: '80%', animationDelay: '-2s' }} />
      <div className="absolute w-1 h-1 bg-white/50 rounded-full blur-[2px] animate-float" style={{ top: '40%', left: '50%', animationDelay: '-4s' }} />
    </div>
  )
}

