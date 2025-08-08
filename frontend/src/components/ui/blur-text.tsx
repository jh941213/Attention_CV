'use client'

import React, { useState, useEffect } from 'react'

interface BlurTextProps {
  text: string
  delay?: number
  className?: string
  animateOnMount?: boolean
}

const BlurText: React.FC<BlurTextProps> = ({
  text,
  delay = 50,
  className = '',
  animateOnMount = true
}) => {
  const [visibleChars, setVisibleChars] = useState<boolean[]>(
    animateOnMount ? new Array(text.length).fill(false) : new Array(text.length).fill(true)
  )

  useEffect(() => {
    if (!animateOnMount) return

    const timeouts: NodeJS.Timeout[] = []
    
    text.split('').forEach((_, index) => {
      const timeout = setTimeout(() => {
        setVisibleChars(prev => {
          const newState = [...prev]
          newState[index] = true
          return newState
        })
      }, index * delay)
      
      timeouts.push(timeout)
    })

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout))
    }
  }, [text, delay, animateOnMount])

  return (
    <span className={`inline-block ${className}`}>
      {text.split('').map((char, index) => (
        <span
          key={index}
          className={`inline-block transition-all duration-300 ease-out ${
            visibleChars[index]
              ? 'blur-0 opacity-100'
              : 'blur-sm opacity-40'
          }`}
          style={{
            filter: visibleChars[index] ? 'blur(0px)' : 'blur(8px)',
            transform: visibleChars[index] ? 'translateY(0px)' : 'translateY(10px)'
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  )
}

export default BlurText