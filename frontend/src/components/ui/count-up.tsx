'use client'

import React, { useState, useEffect, useRef } from 'react'

interface CountUpProps {
  end: number
  start?: number
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
  separator?: string
  className?: string
  enableScrollSpy?: boolean
  scrollSpyDelay?: number
  onComplete?: () => void
}

const CountUp: React.FC<CountUpProps> = ({
  end,
  start = 0,
  duration = 2000,
  decimals = 0,
  prefix = '',
  suffix = '',
  separator = ',',
  className = '',
  enableScrollSpy = false,
  scrollSpyDelay = 0,
  onComplete
}) => {
  const [count, setCount] = useState(start)
  const [hasStarted, setHasStarted] = useState(false)
  const elementRef = useRef<HTMLSpanElement>(null)
  const frameRef = useRef<number>()

  const formatNumber = (num: number) => {
    const fixed = num.toFixed(decimals)
    const parts = fixed.split('.')
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator)
    return parts.join('.')
  }

  const startCounting = () => {
    if (hasStarted) return
    setHasStarted(true)

    const startTime = performance.now()
    const range = end - start

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function for smooth animation
      const easeOutCubic = 1 - Math.pow(1 - progress, 3)
      const currentValue = start + (range * easeOutCubic)

      setCount(currentValue)

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      } else {
        setCount(end)
        onComplete?.()
      }
    }

    frameRef.current = requestAnimationFrame(animate)
  }

  useEffect(() => {
    if (!enableScrollSpy) {
      const timer = setTimeout(startCounting, scrollSpyDelay)
      return () => clearTimeout(timer)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(startCounting, scrollSpyDelay)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )

    if (elementRef.current) {
      observer.observe(elementRef.current)
    }

    return () => {
      observer.disconnect()
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [enableScrollSpy, scrollSpyDelay])

  useEffect(() => {
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])

  return (
    <span ref={elementRef} className={`inline-block tabular-nums ${className}`}>
      {prefix}{formatNumber(count)}{suffix}
    </span>
  )
}

export default CountUp