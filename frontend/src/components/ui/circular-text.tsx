'use client'

import React from 'react'

interface CircularTextProps {
  text: string
  radius?: number
  fontSize?: number
  className?: string
  animate?: boolean
  animationDuration?: number
  reverse?: boolean
}

const CircularText: React.FC<CircularTextProps> = ({
  text,
  radius = 100,
  fontSize = 16,
  className = '',
  animate = false,
  animationDuration = 10,
  reverse = false
}) => {
  const circumference = 2 * Math.PI * radius
  const characterSpacing = circumference / text.length

  const svgSize = (radius + fontSize) * 2

  return (
    <div className={`inline-block ${className}`}>
      <svg
        width={svgSize}
        height={svgSize}
        viewBox={`0 0 ${svgSize} ${svgSize}`}
        className="overflow-visible"
      >
        <defs>
          <path
            id={`circle-${Math.random()}`}
            d={`M ${svgSize / 2} ${fontSize} A ${radius} ${radius} 0 0 ${reverse ? 0 : 1} ${svgSize / 2} ${svgSize - fontSize}`}
          />
        </defs>
        
        {animate && (
          <animateTransform
            attributeName="transform"
            type="rotate"
            values={`0 ${svgSize / 2} ${svgSize / 2};${reverse ? -360 : 360} ${svgSize / 2} ${svgSize / 2}`}
            dur={`${animationDuration}s`}
            repeatCount="indefinite"
          />
        )}
        
        <g
          style={{
            animation: animate ? `spin ${animationDuration}s linear infinite ${reverse ? 'reverse' : 'normal'}` : 'none',
            transformOrigin: `${svgSize / 2}px ${svgSize / 2}px`
          }}
        >
          {text.split('').map((char, index) => {
            const angle = (index / text.length) * 360
            const x = svgSize / 2 + radius * Math.cos((angle - 90) * (Math.PI / 180))
            const y = svgSize / 2 + radius * Math.sin((angle - 90) * (Math.PI / 180))
            
            return (
              <text
                key={index}
                x={x}
                y={y}
                fontSize={fontSize}
                fill="currentColor"
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${angle} ${x} ${y})`}
                className="select-none"
              >
                {char}
              </text>
            )
          })}
        </g>
      </svg>
      
      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(${reverse ? -360 : 360}deg);
          }
        }
      `}</style>
    </div>
  )
}

export default CircularText