'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface AnimatedCardProps {
  children: React.ReactNode
  className?: string
  title?: string
  titleIcon?: React.ReactNode
  validationIcon?: React.ReactNode
  delay?: number
  hover?: boolean
}

const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  className,
  title,
  titleIcon,
  validationIcon,
  delay = 0,
  hover = true
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              setIsVisible(true)
            }, delay)
          }
        })
      },
      { threshold: 0.1 }
    )

    if (cardRef.current) {
      observer.observe(cardRef.current)
    }

    return () => observer.disconnect()
  }, [delay])

  return (
    <Card
      ref={cardRef}
      className={cn(
        "transition-all duration-700 transform border-white/30 dark:border-gray-700/40",
        "bg-white/85 dark:bg-gray-900/85 backdrop-blur-xl backdrop-saturate-150",
        "shadow-xl shadow-blue-500/10 dark:shadow-blue-500/15",
        isVisible 
          ? "opacity-100 translate-y-0 scale-100" 
          : "opacity-0 translate-y-8 scale-95",
        hover && isHovered && "scale-[1.02] shadow-2xl shadow-blue-500/15 dark:shadow-blue-500/25",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {title && (
        <CardHeader className="pb-4">
          <CardTitle className={cn(
            "flex items-center gap-3 text-lg transition-colors duration-300",
            isHovered && "text-primary"
          )}>
            {titleIcon && (
              <div className={cn(
                "transition-transform duration-300",
                isHovered && "scale-110"
              )}>
                {titleIcon}
              </div>
            )}
            <span className="font-semibold">{title}</span>
            {validationIcon && (
              <div className={cn(
                "ml-auto transition-all duration-300",
                isHovered && "scale-110"
              )}>
                {validationIcon}
              </div>
            )}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={cn(
        "space-y-4 transition-all duration-300",
        isVisible ? "opacity-100" : "opacity-0"
      )}>
        {children}
      </CardContent>
    </Card>
  )
}

export default AnimatedCard