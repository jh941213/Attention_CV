'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { GitCompare, Eye, EyeOff, ChevronDown, ChevronUp, Plus, Minus, RotateCcw, X } from 'lucide-react'
import { type CodeChange } from '@/utils/codeUpdater'

interface CodeDiffViewerProps {
  changes: CodeChange[]
  originalCode: string
  updatedCode: string
  isVisible: boolean
  onToggleVisibility: (visible: boolean) => void
  onClose?: () => void
  className?: string
}

const CodeDiffViewer: React.FC<CodeDiffViewerProps> = ({
  changes,
  originalCode,
  updatedCode,
  isVisible,
  onToggleVisibility,
  onClose,
  className = ''
}) => {
  const [expandedChanges, setExpandedChanges] = useState<Set<number>>(new Set())
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified')

  // Auto-expand first few changes
  useEffect(() => {
    if (changes.length > 0) {
      setExpandedChanges(new Set([0, 1].slice(0, changes.length)))
    }
  }, [changes])

  const toggleChange = (index: number) => {
    const newExpanded = new Set(expandedChanges)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedChanges(newExpanded)
  }

  const expandAll = () => {
    setExpandedChanges(new Set(changes.map((_, i) => i)))
  }

  const collapseAll = () => {
    setExpandedChanges(new Set())
  }

  const getOperationColor = (operation: string) => {
    switch (operation) {
      case 'insert':
      case 'append':
      case 'prepend':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'delete':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'replace':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getOperationIcon = (operation: string) => {
    switch (operation) {
      case 'insert':
      case 'append':
      case 'prepend':
        return <Plus className="w-3 h-3" />
      case 'delete':
        return <Minus className="w-3 h-3" />
      case 'replace':
        return <RotateCcw className="w-3 h-3" />
      default:
        return <GitCompare className="w-3 h-3" />
    }
  }

  const formatLineNumbers = (start: number, end: number) => {
    if (start === end) return `Line ${start}`
    return `Lines ${start}-${end}`
  }

  const renderUnifiedDiff = (change: CodeChange) => {
    const { oldContent, newContent, operation } = change

    return (
      <div className="font-mono text-sm">
        {/* Show old content for replace/delete operations */}
        {(operation === 'replace' || operation === 'delete') && oldContent && (
          <div className="bg-red-50 border-l-4 border-red-300 px-3 py-2 mb-2">
            <div className="text-red-600 text-xs font-medium mb-1">- Removed:</div>
            <pre className="whitespace-pre-wrap text-red-800 text-xs leading-relaxed">
              {oldContent}
            </pre>
          </div>
        )}

        {/* Show new content for replace/insert/append/prepend operations */}
        {(operation !== 'delete') && newContent && (
          <div className="bg-green-50 border-l-4 border-green-300 px-3 py-2">
            <div className="text-green-600 text-xs font-medium mb-1">+ Added:</div>
            <pre className="whitespace-pre-wrap text-green-800 text-xs leading-relaxed">
              {newContent}
            </pre>
          </div>
        )}
      </div>
    )
  }

  if (!isVisible) {
    return (
      <div className={`${className}`}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onToggleVisibility(true)}
          className="gap-2 text-xs"
        >
          <GitCompare className="w-3 h-3" />
          Show Changes ({changes.length})
        </Button>
      </div>
    )
  }

  return (
    <Card className={`${className} bg-white/95 dark:bg-gray-900/95 backdrop-blur border border-gray-200/50 dark:border-gray-700/50`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-blue-600" />
          <h3 className="font-semibold text-sm">Code Changes</h3>
          <Badge variant="secondary" className="text-xs">
            {changes.length} change{changes.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={expandAll}
            className="text-xs h-7 px-2"
          >
            <ChevronDown className="w-3 h-3 mr-1" />
            Expand All
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={collapseAll}
            className="text-xs h-7 px-2"
          >
            <ChevronUp className="w-3 h-3 mr-1" />
            Collapse All
          </Button>

          <Separator orientation="vertical" className="h-4" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleVisibility(false)}
            className="text-xs h-7 px-2"
          >
            <EyeOff className="w-3 h-3 mr-1" />
            Hide
          </Button>

          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-xs h-7 w-7 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Changes List */}
      <div className="max-h-96 overflow-y-auto">
        {changes.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No changes to display
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {changes.map((change, index) => (
              <div key={index} className="p-3">
                {/* Change Header */}
                <button
                  onClick={() => toggleChange(index)}
                  className="w-full flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 -mx-1 px-1 py-1 rounded transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${getOperationColor(change.operation)}`}>
                      {getOperationIcon(change.operation)}
                      {change.operation.toUpperCase()}
                    </div>
                    
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {formatLineNumbers(change.lineStart, change.lineEnd)}
                    </span>

                    <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                      {change.description}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {expandedChanges.has(index) ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Change Content */}
                {expandedChanges.has(index) && (
                  <div className="mt-3 ml-2 border-l border-gray-200 dark:border-gray-700 pl-3">
                    {renderUnifiedDiff(change)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Footer */}
      {changes.length > 0 && (
        <div className="p-3 border-t border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/30">
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Summary: {changes.filter(c => c.operation === 'insert' || c.operation === 'append' || c.operation === 'prepend').length} additions, {' '}
            {changes.filter(c => c.operation === 'delete').length} deletions, {' '}
            {changes.filter(c => c.operation === 'replace').length} modifications
          </div>
        </div>
      )}
    </Card>
  )
}

export default CodeDiffViewer