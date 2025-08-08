'use client'

import React, { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface ShinyTextProps {
  text: string
  disabled?: boolean
  speed?: number
  className?: string
  intensity?: 'low' | 'medium' | 'high'
}

const ShinyText: React.FC<ShinyTextProps> = ({ 
  text, 
  disabled = false, 
  speed = 3, 
  className = '',
  intensity = 'medium'
}) => {
  const spanRef = useRef<HTMLSpanElement>(null)

  const getIntensityColor = () => {
    switch (intensity) {
      case 'low':
        return '#6b7280'
      case 'high':
        return '#1f2937'
      default:
        return '#374151'
    }
  }

  useEffect(() => {
    if (disabled || !spanRef.current) return

    const span = spanRef.current
    const keyframes = `
      @keyframes shineEffect {
        0% { background-position: 200% center; }
        100% { background-position: -200% center; }
      }
    `
    
    // Add keyframes to head if not exists
    if (!document.querySelector('#shine-keyframes')) {
      const style = document.createElement('style')
      style.id = 'shine-keyframes'
      style.textContent = keyframes
      document.head.appendChild(style)
    }

    // Apply styles directly
    span.style.background = `linear-gradient(90deg, ${getIntensityColor()} 25%, #ffffff 50%, ${getIntensityColor()} 75%)`
    span.style.backgroundSize = '200% 100%'
    span.style.backgroundClip = 'text'
    span.style.webkitBackgroundClip = 'text'
    span.style.color = 'transparent'
    span.style.animation = `shineEffect ${speed}s linear infinite`
    span.style.display = 'inline-block'
    span.style.fontWeight = 'bold'

  }, [disabled, speed, intensity])

  if (disabled) {
    return (
      <span
        className={cn("inline-block font-bold", className)}
        style={{ color: getIntensityColor() }}
      >
        {text}
      </span>
    )
  }

  return (
    <span
      ref={spanRef}
      className={cn("inline-block font-bold", className)}
    >
      {text}
    </span>
  )
}

export default ShinyText