'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
// ScrollArea 제거됨 - 직접 스크롤 처리
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Send, Bot, User, Code, FileText, Loader2, AlertTriangle, GitCommit, MessageSquare, Sparkles, Brain, Zap, Copy, ThumbsUp, ThumbsDown, RotateCcw, ChevronDown, ChevronUp, Github, Paperclip, X, Upload } from 'lucide-react'
import { UserConfig } from '@/types/chat'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import TypewriterText from '@/components/ui/typewriter-text'
import { applyIncrementalUpdates, generateChangeDescription, type IncrementalCodeUpdate } from '@/utils/codeUpdater'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  files?: any[]
  commitMessage?: string
  requestType?: string
  confidence?: number
  reasoning?: string
  isTyping?: boolean
  thinking?: string
  showThinking?: boolean
}

interface ChatProps {
  userConfig: UserConfig | null
  onCodeGenerated?: (response: {
    files: any[]
    request_type: string
    confidence: number
    reasoning: string
    incremental_update?: IncrementalCodeUpdate
  }) => void
  currentCode?: string
  currentFilename?: string
  currentLanguage?: string
}

const Chat: React.FC<ChatProps> = ({ userConfig, onCodeGenerated, currentCode, currentFilename, currentLanguage }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: '안녕하세요! Attention CV입니다. 당신의 커리어기반 웹페이지를 만들어드릴게요. ✨',
      timestamp: new Date().toISOString(),
      thinking: '사용자가 처음 접속했으니 친근하고 명확한 인사말을 해야겠다. AI 시스템의 기능을 간단히 설명하고, 어떤 종류의 요청을 할 수 있는지 안내하는 것이 좋겠다.',
      showThinking: false,
      isTyping: true
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCommitting, setIsCommitting] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  // Claude-style drag and drop handlers
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
        setIsDragOver(true)
      }
    }

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      // Only hide drag overlay if leaving the entire window
      if (!e.relatedTarget || e.relatedTarget === document.documentElement) {
        setIsDragOver(false)
      }
    }

    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      const files = Array.from(e.dataTransfer?.files || [])
      const supportedTypes = ['.pdf', '.docx', '.doc', '.xlsx', '.xls']
      
      const validFiles = files.filter(file => {
        const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
        return supportedTypes.includes(ext)
      })
      
      if (validFiles.length !== files.length) {
        alert('일부 파일이 지원되지 않는 형식입니다. PDF, Word, Excel 파일만 업로드 가능합니다.')
      }
      
      if (validFiles.length > 0) {
        setUploadedFiles(prev => [...prev, ...validFiles])
      }
    }

    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('dragleave', handleDragLeave)
    document.addEventListener('drop', handleDrop)

    return () => {
      document.removeEventListener('dragover', handleDragOver)
      document.removeEventListener('dragleave', handleDragLeave)
      document.removeEventListener('drop', handleDrop)
    }
  }, [])

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && uploadedFiles.length === 0) || !userConfig || isLoading) return

    // Show user message immediately
    const userMessage: ChatMessage = {
      role: 'user',
      content: inputValue.trim() || '파일을 업로드했습니다.',
      timestamp: new Date().toISOString(),
      files: uploadedFiles.length > 0 ? uploadedFiles.map(file => ({
        filename: file.name,
        content: `[File: ${file.name}]`,
        language: 'file',
      })) : undefined,
    }

    setMessages(prev => [...prev, userMessage])
    const currentInput = inputValue.trim()
    const currentFiles = [...uploadedFiles]
    setInputValue('')
    setUploadedFiles([]) // Clear files immediately
    setIsLoading(true)

    try {
      console.log('🔍 Send message - Session ID:', userConfig?.sessionId || 'default')
      
      // First upload files if any
      if (currentFiles.length > 0) {
        console.log('🔍 Uploading files with message...')
        await Promise.all(currentFiles.map(async (file) => {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('session_id', userConfig.sessionId || 'default')
          
          const uploadResponse = await fetch('http://localhost:8000/api/v1/chat/upload-document', {
            method: 'POST',
            body: formData,
          })
          
          if (!uploadResponse.ok) {
            throw new Error(`${file.name} 업로드 실패: ${uploadResponse.status}`)
          }
          
          return await uploadResponse.json()
        }))
      }

      // Then send the chat message
      const response = await fetch('http://localhost:8000/api/v1/chat/supervisor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: currentInput || (currentFiles.length > 0 ? '업로드한 문서에 대해 알려주세요.' : '안녕하세요'),
          config: userConfig,
          session_id: userConfig?.sessionId || 'default',
          currentCode: currentCode,
          currentFilename: currentFilename,
          currentLanguage: currentLanguage,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: result.response,
        timestamp: new Date().toISOString(),
        files: result.generated_code ? [{
          content: result.generated_code,
          filename: result.filename,
          language: result.language,
          operation: 'create',
          file_path: result.filename
        }] : undefined,
        commitMessage: result.generated_code ? `Add ${result.filename} - ${result.reasoning}` : undefined,
        requestType: result.request_type,
        confidence: result.confidence,
        reasoning: result.reasoning,
        isTyping: true,
        thinking: result.thinking || `사용자의 요청을 분석했습니다. ${result.request_type === 'code' ? '코드 생성' : '일반 채팅'} 요청으로 분류하여 적절한 에이전트로 라우팅했습니다. 확신도: ${Math.round((result.confidence || 0) * 100)}%`,
        showThinking: false
      }

      setMessages(prev => [...prev, assistantMessage])

      // Notify parent component about generated code or incremental updates
      if (onCodeGenerated && (result.generated_code || result.incremental_update)) {
        if (result.incremental_update) {
          // Handle incremental updates
          const incrementalUpdate: IncrementalCodeUpdate = {
            update_type: result.incremental_update.update_type || 'incremental',
            operations: result.incremental_update.operations || [],
            explanation: result.incremental_update.explanation || 'Code updated',
            estimated_impact: result.incremental_update.estimated_impact || 'medium'
          }

          onCodeGenerated({
            files: [], // No full files for incremental updates
            request_type: result.request_type,
            confidence: result.confidence,
            reasoning: result.reasoning,
            incremental_update: incrementalUpdate
          })
        } else if (result.generated_code) {
          // Handle full code generation
          let cleanCode = result.generated_code
          
          // Remove markdown code blocks (```html, ```css, etc.)
          cleanCode = cleanCode.replace(/```[\w]*\n([\s\S]*?)\n```/g, '$1')
          cleanCode = cleanCode.replace(/^```[\w]*\n|```$/gm, '')
          cleanCode = cleanCode.trim()
          
          onCodeGenerated({
            files: [{
              content: cleanCode,
              filename: result.filename,
              language: result.language
            }],
            request_type: result.request_type,
            confidence: result.confidence,
            reasoning: result.reasoning
          })
        }
      }

    } catch (error) {
      console.error('메시지 전송 실패:', error)
      
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `죄송합니다. 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        timestamp: new Date().toISOString(),
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleCommitFiles = async (files: any[], commitMessage: string) => {
    if (!userConfig || !files.length) return

    setIsCommitting(true)
    try {
      const response = await fetch('http://localhost:8000/api/v1/git/commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: userConfig,
          files: files,
          commitMessage: commitMessage + ' - via Chat',
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      const commitSuccessMessage: ChatMessage = {
        role: 'assistant',
        content: `✅ 성공적으로 커밋했습니다!\n- 커밋 SHA: ${result.commit_sha}\n- GitHub Pages: ${result.pages_url || 'URL 확인 중...'}`,
        timestamp: new Date().toISOString(),
      }

      setMessages(prev => [...prev, commitSuccessMessage])

    } catch (error) {
      console.error('커밋 실패:', error)
      
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `커밋 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        timestamp: new Date().toISOString(),
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsCommitting(false)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here
    })
  }

  const handleLike = (messageIndex: number) => {
    // Could send feedback to backend
    console.log('Liked message:', messageIndex)
  }

  const handleDislike = (messageIndex: number) => {
    // Could send feedback to backend
    console.log('Disliked message:', messageIndex)
  }

  const retryMessage = (messageIndex: number) => {
    const message = messages[messageIndex]
    if (message && message.role === 'assistant') {
      // Find the user message that prompted this response
      const userMessage = messages[messageIndex - 1]
      if (userMessage && userMessage.role === 'user') {
        setInputValue(userMessage.content)
        // Could also auto-send the message
      }
    }
  }

  const toggleThinking = (messageIndex: number) => {
    setMessages(prev => 
      prev.map((msg, idx) => 
        idx === messageIndex ? { ...msg, showThinking: !msg.showThinking } : msg
      )
    )
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const supportedTypes = ['.pdf', '.docx', '.doc', '.xlsx', '.xls']
    
    const validFiles = files.filter(file => {
      const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
      return supportedTypes.includes(ext)
    })
    
    if (validFiles.length !== files.length) {
      alert('일부 파일이 지원되지 않는 형식입니다. PDF, Word, Excel 파일만 업로드 가능합니다.')
    }
    
    setUploadedFiles(prev => [...prev, ...validFiles])
    
    // Reset the file input
    if (event.target) {
      event.target.value = ''
    }
  }

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }


  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900 relative">
      {/* Claude-style Drag and Drop Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-blue-50/90 dark:bg-blue-950/90 backdrop-blur-sm">
          <div className="flex items-center justify-center h-full">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border-2 border-dashed border-blue-400 dark:border-blue-500 p-8 max-w-md mx-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  파일을 드롭해주세요
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  PDF, Word, Excel 파일을 분석해드릴게요
                </p>
                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">PDF</span>
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">DOCX</span>
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">XLSX</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages area with Claude-style spacing */}
      <div className="flex-1 overflow-y-auto py-6" ref={scrollAreaRef}>
        <div className="max-w-4xl mx-auto px-6">
          {messages.map((message, index) => (
            <div key={index} className={`mb-8 ${message.role === 'user' ? 'ml-12' : ''}`}>
              {/* Assistant message with avatar */}
              {message.role === 'assistant' ? (
                <div className="flex gap-4 items-start">
                  <div className="relative flex-shrink-0 mt-1">
                    <div className="w-7 h-7 bg-gradient-to-br from-gray-700 to-gray-900 dark:from-gray-600 dark:to-gray-800 rounded-lg flex items-center justify-center shadow-sm">
                      <Github className="w-4 h-4 text-white" />
                    </div>
                    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Thinking Process - collapsible */}
                    {message.thinking && (
                      <div className="mb-3">
                        <button
                          onClick={() => toggleThinking(index)}
                          className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                        >
                          {message.showThinking ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                          <Brain className="w-3 h-3" />
                          <span>사고과정</span>
                        </button>
                        {message.showThinking && (
                          <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800/70 rounded-lg border border-gray-300 dark:border-gray-600">
                            <div className="text-sm text-gray-700 dark:text-gray-300 italic leading-relaxed">
                              {message.thinking}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Agent type badge - more subtle */}
                    {message.requestType && (
                      <div className="mb-2 inline-flex items-center gap-1.5 px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-md font-medium">
                        {message.requestType === 'code' ? (
                          <>
                            <Code className="w-3 h-3" />
                            코드 모드
                          </>
                        ) : (
                          <>
                            <MessageSquare className="w-3 h-3" />
                            채팅 모드
                          </>
                        )}
                        <span className="text-gray-500">•</span>
                        <span>{Math.round((message.confidence || 0) * 100)}%</span>
                      </div>
                    )}
                    
                    {/* Message content */}
                    <div className="prose prose-gray dark:prose-invert prose-sm max-w-none">
                      {message.role === 'assistant' && message.isTyping ? (
                        <TypewriterText
                          text={message.content}
                          typingSpeed={30}
                          showCursor={false}
                          startImmediately={true}
                          className="text-sm leading-6"
                          as="div"
                          onSentenceComplete={() => {
                            setMessages(prev => prev.map(msg => 
                              msg === message ? { ...msg, isTyping: false } : msg
                            ))
                          }}
                        />
                      ) : (
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({children}) => <p className="mb-3 last:mb-0 text-gray-900 dark:text-gray-100 leading-relaxed">{children}</p>,
                            ul: ({children}) => <ul className="mb-3 ml-5 list-disc space-y-1">{children}</ul>,
                            ol: ({children}) => <ol className="mb-3 ml-5 list-decimal space-y-1">{children}</ol>,
                            li: ({children}) => <li className="text-gray-900 dark:text-gray-100">{children}</li>,
                            code: ({children, className}) => {
                              const isInline = !className
                              return isInline ? (
                                <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded text-sm font-mono">{children}</code>
                              ) : (
                                <code className="block p-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded text-sm font-mono overflow-x-auto">{children}</code>
                              )
                            }
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      )}
                    </div>

                    {/* Generated files display */}
                    {message.files && message.files.length > 0 && (
                      <div className="mt-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            <FileText className="w-4 h-4" />
                            생성된 파일 ({message.files.length}개)
                          </div>
                        </div>
                        <div className="p-4 space-y-3">
                          {message.files.map((file: any, fileIndex: number) => (
                            <div key={fileIndex} className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                              <div className="bg-gray-50 dark:bg-gray-800 px-3 py-2 flex items-center gap-2">
                                <span className="text-sm font-mono font-medium text-gray-700 dark:text-gray-300">{file.filename}</span>
                                <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                                  {file.language}
                                </span>
                              </div>
                              <div className="p-3 bg-white dark:bg-gray-900 font-mono text-xs text-gray-700 dark:text-gray-300 overflow-x-auto max-h-32">
                                {file.content.slice(0, 300)}
                                {file.content.length > 300 && '...'}
                              </div>
                            </div>
                          ))}
                          
                          {/* Commit button */}
                          {message.commitMessage && (
                            <button
                              onClick={() => handleCommitFiles(message.files || [], message.commitMessage!)}
                              disabled={isCommitting}
                              className="w-full mt-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-md text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2"
                            >
                              {isCommitting ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  커밋 중...
                                </>
                              ) : (
                                <>
                                  <GitCommit className="w-4 h-4" />
                                  GitHub Pages에 배포
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action buttons for assistant messages */}
                    <div className="flex items-center gap-2 mt-3 pt-2">
                      <button
                        onClick={() => copyToClipboard(message.content)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                        title="복사"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleLike(index)}
                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                        title="좋아요"
                      >
                        <ThumbsUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDislike(index)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="싫어요"
                      >
                        <ThumbsDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => retryMessage(index)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                        title="재호출"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* User message - simple right-aligned bubble */
                <div className="flex justify-end">
                  <div className="group relative">
                    <div className="bg-gray-600 dark:bg-gray-700 text-white px-4 py-2.5 rounded-2xl max-w-xl">
                      <div className="text-sm leading-relaxed">{message.content}</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(message.content)}
                      className="absolute -left-8 top-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-all duration-200"
                      title="복사"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
              
              {/* Timestamp */}
              <div className={`text-xs text-gray-400 mt-1.5 ${
                message.role === 'user' ? 'text-right mr-4' : 'ml-11'
              }`}>
                {formatTimestamp(message.timestamp)}
              </div>
            </div>
          ))}
          
          {/* Loading indicator - Claude style */}
          {isLoading && (
            <div className="mb-8">
              <div className="flex gap-4 items-start">
                <div className="relative flex-shrink-0 mt-1">
                  <div className="w-7 h-7 bg-gradient-to-br from-gray-700 to-gray-900 dark:from-gray-600 dark:to-gray-800 rounded-lg flex items-center justify-center shadow-sm">
                    <Github className="w-4 h-4 text-white" />
                  </div>
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 py-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fixed Enhanced Input area */}
      <div className="flex-none border-t bg-gradient-to-r from-background via-muted/20 to-background p-4">
        {/* Claude-style File Waiting Area - shows files attached to the current message */}
        {uploadedFiles.length > 0 && (
          <div className="mb-3">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700/50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Paperclip className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {uploadedFiles.length}개 파일이 메시지와 함께 전송됩니다
                </span>
              </div>
              
              <div className="space-y-2">
                {uploadedFiles.map((file, index) => {
                  const getFileIcon = (filename: string) => {
                    const ext = filename.toLowerCase().split('.').pop()
                    if (ext === 'pdf') return '📄'
                    if (ext === 'docx' || ext === 'doc') return '📝'
                    if (ext === 'xlsx' || ext === 'xls') return '📊'
                    return '📎'
                  }
                  
                  return (
                    <div key={index} className="group flex items-center gap-3 p-2 bg-white dark:bg-gray-700/30 rounded-md border border-gray-200 dark:border-gray-600/50">
                      <div className="flex-shrink-0">
                        <span className="text-lg">{getFileIcon(file.name)}</span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {(file.size / 1024).toFixed(1)}KB
                        </p>
                      </div>
                      
                      <button
                        onClick={() => removeFile(index)}
                        className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                        title="파일 제거"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="AI와 대화하거나 코드 생성을 요청해보세요..."
              disabled={isLoading}
              className="pl-12 pr-12 h-11 bg-background/50 border-muted-foreground/20 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-foreground placeholder:text-muted-foreground"
            />
            {/* Claude-style File Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isUploading}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200 disabled:opacity-50 group"
              title="파일 업로드 (PDF, Word, Excel)"
            >
              <div className="relative">
                <Paperclip className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                {uploadedFiles.length > 0 && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
                )}
              </div>
            </button>
            
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {userConfig && (
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs font-medium text-muted-foreground">준비됨</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.doc,.xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading || !userConfig}
            size="icon"
            className="h-11 w-11 shadow-sm hover:shadow-md transition-all duration-200"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <div className="relative">
                <Send className="w-4 h-4" />
                {inputValue.trim() && (
                  <div className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                )}
              </div>
            )}
          </Button>
        </div>
        
        {!userConfig && (
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-md border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">설정을 완료해야 AI 에이전트를 사용할 수 있습니다</span>
          </div>
        )}

        {userConfig && (
          <div className="mt-2 flex items-center justify-end text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd>
              <span>전송</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Chat