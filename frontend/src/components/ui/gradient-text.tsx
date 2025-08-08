'use client'

import React from 'react'

interface GradientTextProps {
  children: React.ReactNode
  from?: string
  via?: string
  to?: string
  animate?: boolean
  className?: string
}

const GradientText: React.FC<GradientTextProps> = ({
  children,
  from = 'from-blue-400',
  via,
  to = 'to-purple-600',
  animate = false,
  className = ''
}) => {
  const gradientClasses = `bg-gradient-to-r ${from} ${via || ''} ${to}`.trim()
  
  return (
    <span 
      className={`
        inline-block bg-clip-text text-transparent ${gradientClasses}
        ${animate ? 'animate-gradient-x' : ''}
        ${className}
      `}
      style={{
        backgroundSize: animate ? '200% 200%' : '100% 100%',
        ...(animate && {
          animation: 'gradient-x 3s ease infinite',
        })
      }}
    >
      {children}
      
      <style jsx>{`
        @keyframes gradient-x {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
      `}</style>
    </span>
  )
}

export default GradientText