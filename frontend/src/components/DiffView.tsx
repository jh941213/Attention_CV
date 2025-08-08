'use client'

import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Check, X, Eye, EyeOff, FileText, GitCompare, Zap, Clock } from 'lucide-react'
import { diffLines, diffChars } from 'diff'

interface DiffViewProps {
  originalCode: string
  suggestedCode: string
  filename: string
  language: string
  onAccept: () => void
  onReject: () => void
  onClose?: () => void
  description?: string
}

interface DiffLine {
  type: 'added' | 'removed' | 'context'
  content: string
  lineNumber: {
    old?: number
    new?: number
  }
}

const DiffView: React.FC<DiffViewProps> = ({
  originalCode,
  suggestedCode,
  filename,
  language,
  onAccept,
  onReject,
  onClose,
  description
}) => {
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified')
  const [showLineNumbers, setShowLineNumbers] = useState(true)
  
  const diffResult = useMemo(() => {
    const changes = diffLines(originalCode, suggestedCode)
    const lines: DiffLine[] = []
    let oldLineNumber = 1
    let newLineNumber = 1
    
    changes.forEach((change) => {
      const changeLines = change.value.split('\n').filter((line, index, array) => {
        // Keep empty lines except for the last one if it's empty
        return index < array.length - 1 || line !== ''
      })
      
      changeLines.forEach((line) => {
        if (change.added) {
          lines.push({
            type: 'added',
            content: line,
            lineNumber: { new: newLineNumber++ }
          })
        } else if (change.removed) {
          lines.push({
            type: 'removed',
            content: line,
            lineNumber: { old: oldLineNumber++ }
          })
        } else {
          lines.push({
            type: 'context',
            content: line,
            lineNumber: { old: oldLineNumber++, new: newLineNumber++ }
          })
        }
      })
    })
    
    return lines
  }, [originalCode, suggestedCode])

  const stats = useMemo(() => {
    const added = diffResult.filter(line => line.type === 'added').length
    const removed = diffResult.filter(line => line.type === 'removed').length
    const changed = Math.max(added, removed)
    
    return { added, removed, changed }
  }, [diffResult])

  const getLineClassName = (type: DiffLine['type']) => {
    switch (type) {
      case 'added':
        return 'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500'
      case 'removed':
        return 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500'
      case 'context':
        return 'bg-background'
      default:
        return ''
    }
  }

  const getLinePrefix = (type: DiffLine['type']) => {
    switch (type) {
      case 'added':
        return '+'
      case 'removed':
        return '-'
      case 'context':
        return ' '
      default:
        return ' '
    }
  }

  const getLineNumberColor = (type: DiffLine['type']) => {
    switch (type) {
      case 'added':
        return 'text-green-600 dark:text-green-400'
      case 'removed':
        return 'text-red-600 dark:text-red-400'
      case 'context':
        return 'text-muted-foreground'
      default:
        return 'text-muted-foreground'
    }
  }

  return (
    <Card className="h-full flex flex-col shadow-lg border-2">
      <CardHeader className="flex-none pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <GitCompare className="h-5 w-5 text-primary" />
              <Zap className="absolute -top-1 -right-1 h-2 w-2 text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {filename}
                <Badge variant="outline" className="text-xs">
                  {language}
                </Badge>
              </CardTitle>
              {description && (
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
              )}
            </div>
          </div>
          
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        {/* Stats and controls */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-1 text-xs">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              +{stats.added}
            </Badge>
            <Badge variant="outline" className="gap-1 text-xs">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              -{stats.removed}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {stats.changed} changes
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLineNumbers(!showLineNumbers)}
              className="h-8 px-2 text-xs gap-1"
            >
              {showLineNumbers ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              Lines
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode(viewMode === 'unified' ? 'split' : 'unified')}
              className="h-8 px-2 text-xs"
            >
              {viewMode === 'unified' ? 'Split' : 'Unified'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <Separator />
      
      {/* Diff content */}
      <CardContent className="flex-1 p-0 min-h-0">
        <div className="h-full overflow-auto">
          <div className="font-mono text-sm">
            {diffResult.map((line, index) => (
              <div
                key={index}
                className={`flex ${getLineClassName(line.type)} hover:bg-muted/5 transition-colors`}
              >
                {/* Line numbers */}
                {showLineNumbers && (
                  <div className={`flex-none px-3 py-1 text-xs border-r border-border/50 bg-muted/20 ${getLineNumberColor(line.type)}`}>
                    <div className="flex gap-2 min-w-16">
                      <span className="w-6 text-right">
                        {line.lineNumber.old || ''}
                      </span>
                      <span className="w-6 text-right">
                        {line.lineNumber.new || ''}
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Diff indicator */}
                <div className={`flex-none w-8 py-1 text-center text-xs font-bold ${getLineNumberColor(line.type)}`}>
                  {getLinePrefix(line.type)}
                </div>
                
                {/* Code content */}
                <div className="flex-1 px-3 py-1 overflow-x-auto">
                  <pre className="whitespace-pre-wrap break-words">
                    {line.content}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      
      <Separator />
      
      {/* Action buttons */}
      <div className="flex-none p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Review the changes and decide</span>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onReject}
              className="gap-2 hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-900/20"
            >
              <X className="h-4 w-4" />
              Reject
            </Button>
            <Button
              size="sm"
              onClick={onAccept}
              className="gap-2 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
            >
              <Check className="h-4 w-4" />
              Accept
            </Button>
          </div>
        </div>
        
        {/* Keyboard shortcuts hint */}
        <div className="flex items-center justify-center mt-2 text-xs text-muted-foreground">
          <span>Press </span>
          <kbd className="px-1 py-0.5 mx-1 bg-muted rounded text-xs">Ctrl+A</kbd>
          <span> to accept or </span>
          <kbd className="px-1 py-0.5 mx-1 bg-muted rounded text-xs">Ctrl+R</kbd>
          <span> to reject</span>
        </div>
      </div>
    </Card>
  )
}

export default DiffView