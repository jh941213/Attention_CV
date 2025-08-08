'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Copy, Download, GitCommit, RotateCcw, Wand2, Diff, FileCode, Sparkles } from 'lucide-react'
import { UserConfig } from '@/types/chat'
import DiffView from './DiffView'

// Diff 유틸리티 함수
const getDiffLines = (oldText: string, newText: string) => {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  const maxLines = Math.max(oldLines.length, newLines.length)
  const diffLines = []

  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i] || ''
    const newLine = newLines[i] || ''
    
    if (oldLine === newLine) {
      diffLines.push({ type: 'equal', content: newLine, lineNumber: i + 1 })
    } else if (!oldLine && newLine) {
      diffLines.push({ type: 'added', content: newLine, lineNumber: i + 1 })
    } else if (oldLine && !newLine) {
      diffLines.push({ type: 'removed', content: oldLine, lineNumber: i + 1 })
    } else {
      diffLines.push({ type: 'modified', content: newLine, oldContent: oldLine, lineNumber: i + 1 })
    }
  }
  
  return diffLines
}

interface CodeEditorProps {
  code: string
  language: string
  filename: string
  onCodeChange: (code: string) => void
  onLanguageChange: (language: string) => void
  onFilenameChange: (filename: string) => void
  onGenerateCode: (prompt: string) => void
  onCommitCode: () => void
  userConfig: UserConfig | null
  isLoading?: boolean
  suggestedCode?: string
  suggestionDescription?: string
}

interface CodeSuggestion {
  code: string
  description: string
  timestamp: number
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  language,
  filename,
  onCodeChange,
  onLanguageChange,
  onFilenameChange,
  onGenerateCode,
  onCommitCode,
  userConfig,
  isLoading = false,
  suggestedCode,
  suggestionDescription
}) => {
  const [codePrompt, setCodePrompt] = useState('')
  const [originalCode, setOriginalCode] = useState('')
  const [hasChanges, setHasChanges] = useState(false)
  const [showDiff, setShowDiff] = useState(false)
  const [pendingSuggestion, setPendingSuggestion] = useState<CodeSuggestion | null>(null)
  const [suggestionMode, setSuggestionMode] = useState<'none' | 'preview' | 'diff'>('none')
  
  // 스크롤 동기화를 위한 refs
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const lineNumbersRef = React.useRef<HTMLDivElement>(null)

  // Track changes for diff view
  useEffect(() => {
    if (code && !originalCode) {
      setOriginalCode(code)
    }
    setHasChanges(code !== originalCode && originalCode !== '')
  }, [code, originalCode])

  // Handle new suggestions
  useEffect(() => {
    if (suggestedCode && suggestedCode !== code) {
      setPendingSuggestion({
        code: suggestedCode,
        description: suggestionDescription || 'AI가 코드를 개선했습니다',
        timestamp: Date.now()
      })
      setSuggestionMode('diff')
    }
  }, [suggestedCode, suggestionDescription, code])

  // Keyboard shortcuts for accept/reject
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (pendingSuggestion && suggestionMode === 'diff') {
        if (e.ctrlKey && e.key === 'a') {
          e.preventDefault()
          handleAcceptSuggestion()
        } else if (e.ctrlKey && e.key === 'r') {
          e.preventDefault()
          handleRejectSuggestion()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [pendingSuggestion, suggestionMode])

  const handleGenerateCode = async () => {
    if (!codePrompt.trim() || !userConfig) return
    
    try {
      await onGenerateCode(codePrompt)
      setCodePrompt('')
    } catch (error) {
      console.error('코드 생성 실패:', error)
    }
  }

  const handleCopyCode = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code)
      } else {
        // Fallback for non-HTTPS environments
        const textArea = document.createElement('textarea')
        textArea.value = code
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        textArea.remove()
      }
      // TODO: Add toast notification
    } catch (error) {
      console.error('코드 복사 실패:', error)
    }
  }

  const handleDownloadCode = () => {
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleResetCode = () => {
    onCodeChange(originalCode)
    setHasChanges(false)
  }

  const handleAcceptSuggestion = () => {
    if (pendingSuggestion) {
      setOriginalCode(code) // Save current as original for future diffs
      onCodeChange(pendingSuggestion.code)
      setPendingSuggestion(null)
      setSuggestionMode('none')
    }
  }

  const handleRejectSuggestion = () => {
    setPendingSuggestion(null)
    setSuggestionMode('none')
  }

  const handleCloseDiff = () => {
    setSuggestionMode('none')
    // Keep the suggestion for later review
  }

  // 스크롤 동기화 핸들러
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop
    }
  }

  const getLanguageOptions = () => [
    { value: 'html', label: 'HTML' },
    { value: 'css', label: 'CSS' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'jsx', label: 'React JSX' },
    { value: 'tsx', label: 'React TSX' },
    { value: 'python', label: 'Python' },
    { value: 'json', label: 'JSON' }
  ]

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-none px-4 py-3 border-b bg-background">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <FileCode className="h-5 w-5 text-primary" />
              {pendingSuggestion && (
                <Sparkles className="absolute -top-1 -right-1 h-2 w-2 text-blue-400 animate-pulse" />
              )}
            </div>
            <span className="font-semibold">코드 에디터</span>
            {hasChanges && (
              <Badge variant="secondary" className="text-xs">
                변경됨
              </Badge>
            )}
            {pendingSuggestion && (
              <Badge variant="default" className="text-xs gap-1 bg-blue-600">
                <Sparkles className="h-3 w-3" />
                AI 제안
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {pendingSuggestion && suggestionMode === 'none' && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setSuggestionMode('diff')}
                className="gap-1 bg-blue-600 hover:bg-blue-700"
              >
                <Sparkles className="h-3 w-3" />
                제안 보기
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCode}
              disabled={!code}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadCode}
              disabled={!code}
            >
              <Download className="h-4 w-4" />
            </Button>
            {hasChanges && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDiff(!showDiff)}
                  className={showDiff ? 'bg-blue-100' : ''}
                >
                  <Diff className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetCode}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={onCommitCode}
              disabled={!code || !userConfig?.gitConfig}
            >
              <GitCommit className="h-4 w-4" />
              커밋
            </Button>
          </div>
        </div>
        
        {/* File settings */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">파일명:</label>
            <input
              type="text"
              value={filename}
              onChange={(e) => onFilenameChange(e.target.value)}
              className="px-2 py-1 text-sm border rounded w-32"
              placeholder="파일명"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">언어:</label>
            <Select value={language} onValueChange={onLanguageChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getLanguageOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Code generation prompt */}
        <div className="space-y-2">
          <label className="text-sm font-medium">코드 생성 요청:</label>
          <div className="flex gap-2">
            <Textarea
              value={codePrompt}
              onChange={(e) => setCodePrompt(e.target.value)}
              placeholder="원하는 코드를 설명해주세요... (예: 반응형 네비게이션 바 만들어줘)"
              className="flex-1 min-h-[40px] max-h-[80px]"
              rows={2}
            />
            <Button
              onClick={handleGenerateCode}
              disabled={!codePrompt.trim() || !userConfig || isLoading}
              className="self-end"
            >
              {isLoading ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {suggestionMode === 'diff' && pendingSuggestion ? (
          // AI Suggestion Diff View
          <DiffView
            originalCode={code}
            suggestedCode={pendingSuggestion.code}
            filename={filename}
            language={language}
            description={pendingSuggestion.description}
            onAccept={handleAcceptSuggestion}
            onReject={handleRejectSuggestion}
            onClose={handleCloseDiff}
          />
        ) : showDiff && hasChanges ? (
          // Regular Diff 보기 모드
          <div className="h-full overflow-y-auto bg-gray-50">
            <div className="p-4">
              <div className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Diff className="h-4 w-4" />
                변경사항 비교
              </div>
              <div className="bg-white border rounded font-mono text-sm">
                {getDiffLines(originalCode, code).map((line, index) => (
                  <div
                    key={index}
                    className={`px-3 py-1 border-l-4 ${
                      line.type === 'added'
                        ? 'bg-green-50 border-green-400 text-green-800'
                        : line.type === 'removed'
                        ? 'bg-red-50 border-red-400 text-red-800 line-through'
                        : line.type === 'modified'
                        ? 'bg-yellow-50 border-yellow-400 text-yellow-800'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <span className="inline-block w-8 text-xs text-gray-400 mr-2">
                      {line.lineNumber}
                    </span>
                    {line.type === 'modified' ? (
                      <div>
                        <div className="bg-red-100 text-red-800 line-through mb-1 px-1 rounded">
                          - {line.oldContent}
                        </div>
                        <div className="bg-green-100 text-green-800 px-1 rounded">
                          + {line.content}
                        </div>
                      </div>
                    ) : (
                      <span>
                        {line.type === 'added' && '+ '}
                        {line.type === 'removed' && '- '}
                        {line.content}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // 일반 코드 에디터 모드
          <div className="h-full flex">
            {/* Line numbers */}
            {code && (
              <div 
                ref={lineNumbersRef}
                className="w-12 bg-gray-50 text-right pr-2 text-xs text-gray-400 select-none border-r flex-shrink-0 overflow-hidden"
                style={{ 
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  pointerEvents: 'none', // 라인 번호 영역에서 스크롤 방지
                }}
              >
                <div 
                  style={{ 
                    lineHeight: '1.5rem',
                    paddingTop: '0.5rem',
                    paddingBottom: '0.5rem'
                  }}
                >
                  {code.split('\n').map((_, index) => (
                    <div key={index} style={{ height: '1.5rem' }}>
                      {index + 1}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Code editor */}
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={code}
                onChange={(e) => onCodeChange(e.target.value)}
                onScroll={handleScroll}
                placeholder="생성된 코드가 여기에 표시됩니다..."
                className="w-full h-full resize-none border-0 rounded-none font-mono text-sm"
                style={{ 
                  lineHeight: '1.5rem',
                  paddingLeft: '0.5rem',
                  paddingTop: '0.5rem',
                  paddingBottom: '0.5rem'
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CodeEditor