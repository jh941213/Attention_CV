'use client'

import React, { useState, useEffect } from 'react'

interface LiveClockProps {
  className?: string
  format?: '12h' | '24h'
  showSeconds?: boolean
  showDate?: boolean
}

const LiveClock: React.FC<LiveClockProps> = ({
  className = '',
  format = '24h',
  showSeconds = true,
  showDate = false
}) => {
  const [time, setTime] = useState<Date>(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatTime = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      ...(showSeconds && { second: '2-digit' }),
      hour12: format === '12h'
    }

    return date.toLocaleTimeString('ko-KR', options)
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    })
  }

  return (
    <div className={`flex flex-col items-end ${className}`}>
      <div className="font-mono text-sm font-medium">
        {formatTime(time)}
      </div>
      {showDate && (
        <div className="text-xs text-muted-foreground mt-1">
          {formatDate(time)}
        </div>
      )}
    </div>
  )
}

export default LiveClock