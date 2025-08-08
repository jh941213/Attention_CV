'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface FloatingLabelInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  success?: boolean
  icon?: React.ReactNode
  validationIcon?: React.ReactNode
}

const FloatingLabelInput: React.FC<FloatingLabelInputProps> = ({
  label,
  error,
  success = false,
  icon,
  validationIcon,
  className,
  value,
  onChange,
  onFocus,
  onBlur,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false)
  const [hasValue, setHasValue] = useState(!!value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setHasValue(!!value)
  }, [value])

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true)
    onFocus?.(e)
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false)
    onBlur?.(e)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHasValue(!!e.target.value)
    onChange?.(e)
  }

  const isLabelFloating = isFocused || hasValue

  return (
    <div className="relative group">
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-muted-foreground transition-colors group-hover:text-foreground">
            {icon}
          </div>
        )}
        
        <Input
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn(
            "peer h-12 pt-6 pb-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-white/30 dark:border-gray-700/40",
            "text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400",
            "focus:border-primary/60 focus:ring-2 focus:ring-primary/30 transition-all duration-300",
            "hover:bg-white/90 dark:hover:bg-gray-900/90 hover:border-white/50 dark:hover:border-gray-600/50",
            icon && "pl-10",
            validationIcon && "pr-12",
            error && "border-red-400 focus:border-red-500 focus:ring-red-300",
            success && "border-green-400 focus:border-green-500 focus:ring-green-300",
            className
          )}
          {...props}
        />

        {validationIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
            {validationIcon}
          </div>
        )}

        <label
          className={cn(
            "absolute left-3 transition-all duration-300 pointer-events-none font-medium",
            icon && "left-10",
            isLabelFloating
              ? "top-1.5 text-xs text-gray-700 dark:text-gray-300"
              : "top-1/2 -translate-y-1/2 text-sm text-gray-600 dark:text-gray-400",
            error && isLabelFloating && "text-red-600 dark:text-red-400",
            success && isLabelFloating && "text-green-700 dark:text-green-400"
          )}
          onClick={() => inputRef.current?.focus()}
        >
          {label}
        </label>
      </div>

      {error && (
        <div className="mt-1.5 text-xs text-red-500 animate-in slide-in-from-top-1 fade-in-0">
          {error}
        </div>
      )}
    </div>
  )
}

export default FloatingLabelInput