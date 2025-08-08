'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PulseButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  variant?: 'default' | 'outline' | 'ghost' | 'primary' | 'success'
  size?: 'sm' | 'default' | 'lg'
  loading?: boolean
  pulseColor?: string
  glowEffect?: boolean
}

const PulseButton: React.FC<PulseButtonProps> = ({
  children,
  variant = 'default',
  size = 'default',
  loading = false,
  pulseColor = 'primary',
  glowEffect = true,
  className,
  disabled,
  onClick,
  ...props
}) => {
  const [isClicked, setIsClicked] = useState(false)

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return
    
    setIsClicked(true)
    setTimeout(() => setIsClicked(false), 200)
    onClick?.(e)
  }

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-blue-600/20"
      case 'success':
        return "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white border-green-600/20"
      case 'outline':
        return "bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-white/30 dark:border-gray-700/30 hover:bg-white/70 dark:hover:bg-gray-900/70"
      default:
        return "bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border-white/20 dark:border-gray-700/30 hover:bg-white/80 dark:hover:bg-gray-900/80"
    }
  }

  const getPulseColor = () => {
    switch (pulseColor) {
      case 'success':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
      case 'warning':
        return 'bg-yellow-500'
      default:
        return 'bg-blue-500'
    }
  }

  return (
    <div className="relative group">
      <Button
        className={cn(
          "relative overflow-hidden transition-all duration-300 transform",
          "hover:scale-105 hover:shadow-lg",
          glowEffect && "hover:shadow-xl hover:shadow-blue-500/25",
          isClicked && "scale-95",
          getVariantStyles(),
          className
        )}
        size={size}
        disabled={disabled || loading}
        onClick={handleClick}
        {...props}
      >
        {/* Pulse effect */}
        <div
          className={cn(
            "absolute inset-0 rounded-md transition-opacity duration-300",
            getPulseColor(),
            "opacity-0 group-hover:opacity-20",
            loading && "animate-pulse opacity-30"
          )}
        />
        
        {/* Ripple effect on click */}
        {isClicked && (
          <div className="absolute inset-0 rounded-md">
            <div 
              className={cn(
                "absolute inset-0 rounded-md animate-ping",
                getPulseColor(),
                "opacity-75"
              )} 
            />
          </div>
        )}

        {/* Content */}
        <span className="relative z-10 flex items-center justify-center gap-2">
          {children}
        </span>
      </Button>

      {/* Glow effect */}
      {glowEffect && !disabled && (
        <div 
          className={cn(
            "absolute inset-0 rounded-md transition-opacity duration-300 -z-10",
            "bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-lg",
            "opacity-0 group-hover:opacity-100 scale-110"
          )}
        />
      )}
    </div>
  )
}

export default PulseButton