'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Play, Pause, RotateCcw, ExternalLink, Monitor, Smartphone, Tablet, Maximize2, Minimize2, Zap, Eye } from 'lucide-react'

interface LivePreviewPanelProps {
  code: string
  language: string
  filename: string
  isAutoPreview?: boolean
  onToggleAutoPreview?: (enabled: boolean) => void
}

const LivePreviewPanel: React.FC<LivePreviewPanelProps> = ({ 
  code, 
  language, 
  filename,
  isAutoPreview = true,
  onToggleAutoPreview 
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isPreviewEnabled, setIsPreviewEnabled] = useState(true)
  const [viewportMode, setViewportMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [isLoading, setIsLoading] = useState(false)

  // Generate preview content based on file type
  const generatePreviewContent = () => {
    if (!code.trim()) {
      return `
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-align: center;
              }
              .placeholder {
                padding: 2rem;
                border-radius: 1rem;
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
              }
              .icon { font-size: 3rem; margin-bottom: 1rem; }
              .title { font-size: 1.5rem; margin-bottom: 0.5rem; font-weight: 600; }
              .subtitle { opacity: 0.8; font-size: 0.9rem; }
            </style>
          </head>
          <body>
            <div class="placeholder">
              <div class="icon">⚡</div>
              <div class="title">Open Canvas</div>
              <div class="subtitle">AI와 대화하며 실시간으로 코드를 작성해보세요</div>
            </div>
          </body>
        </html>
      `
    }

    // Handle different file types
    if (language === 'html' || filename.endsWith('.html')) {
      // Check if it's a complete HTML document
      if (code.includes('<!DOCTYPE') || code.includes('<html>')) {
        return code
      } else {
        // Wrap partial HTML in a complete document
        return `
          <!DOCTYPE html>
          <html lang="ko">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Live Preview</title>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  margin: 0;
                  padding: 20px;
                  line-height: 1.6;
                  color: #333;
                  background: #ffffff;
                }
                * { box-sizing: border-box; }
              </style>
            </head>
            <body>
              ${code}
            </body>
          </html>
        `
      }
    } else if (language === 'css') {
      return `
        <!DOCTYPE html>
        <html lang="ko">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>CSS Preview</title>
            <style>
              ${code}
            </style>
          </head>
          <body>
            <div class="preview-container">
              <h1>CSS 스타일 미리보기</h1>
              <p>이 페이지에서 CSS 스타일이 적용된 결과를 확인할 수 있습니다.</p>
              <div class="sample-content">
                <h2>샘플 제목</h2>
                <p>샘플 문단입니다. CSS 스타일이 어떻게 적용되는지 확인해보세요.</p>
                <button>샘플 버튼</button>
              </div>
            </div>
          </body>
        </html>
      `
    } else if (language === 'javascript' || language === 'js') {
      return `
        <!DOCTYPE html>
        <html lang="ko">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>JavaScript Preview</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 20px;
                background: #f5f5f5;
              }
              .console {
                background: #1e1e1e;
                color: #d4d4d4;
                padding: 15px;
                border-radius: 8px;
                font-family: 'Monaco', 'Menlo', monospace;
                margin-top: 20px;
                min-height: 200px;
                overflow-y: auto;
              }
            </style>
          </head>
          <body>
            <h1>JavaScript 실행 결과</h1>
            <div id="output"></div>
            <div class="console" id="console"></div>
            
            <script>
              // Console log override to capture output
              const consoleDiv = document.getElementById('console');
              const originalLog = console.log;
              const originalError = console.error;
              
              console.log = function(...args) {
                originalLog.apply(console, args);
                const logElement = document.createElement('div');
                logElement.textContent = '> ' + args.join(' ');
                logElement.style.color = '#4CAF50';
                consoleDiv.appendChild(logElement);
                consoleDiv.scrollTop = consoleDiv.scrollHeight;
              };
              
              console.error = function(...args) {
                originalError.apply(console, args);
                const errorElement = document.createElement('div');
                errorElement.textContent = '❌ ' + args.join(' ');
                errorElement.style.color = '#f44336';
                consoleDiv.appendChild(errorElement);
                consoleDiv.scrollTop = consoleDiv.scrollHeight;
              };
              
              try {
                ${code}
              } catch (error) {
                console.error('실행 오류:', error.message);
              }
            </script>
          </body>
        </html>
      `
    } else {
      // For other languages, show code with syntax highlighting
      return `
        <!DOCTYPE html>
        <html lang="ko">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Code Preview</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 20px;
                background: #f8f9fa;
              }
              pre {
                background: #1e1e1e;
                color: #d4d4d4;
                padding: 20px;
                border-radius: 8px;
                overflow-x: auto;
                font-family: 'Monaco', 'Menlo', monospace;
                line-height: 1.5;
              }
              .header {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 15px;
              }
              .badge {
                background: #007acc;
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>${filename}</h2>
              <span class="badge">${language.toUpperCase()}</span>
            </div>
            <pre><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
          </body>
        </html>
      `
    }
  }

  // Update preview when code changes
  const updatePreview = () => {
    if (!iframeRef.current || !isPreviewEnabled) return
    
    setIsLoading(true)
    const content = generatePreviewContent()
    
    try {
      const blob = new Blob([content], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      
      iframeRef.current.src = url
      setLastUpdate(new Date())
      
      // Cleanup previous blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      console.error('Preview update failed:', error)
    } finally {
      setTimeout(() => setIsLoading(false), 500)
    }
  }

  // Auto update when code changes
  useEffect(() => {
    if (isAutoPreview && isPreviewEnabled) {
      const timeoutId = setTimeout(updatePreview, 300) // Debounce
      return () => clearTimeout(timeoutId)
    }
  }, [code, isAutoPreview, isPreviewEnabled])

  // Manual refresh
  const handleRefresh = () => {
    updatePreview()
  }

  // Toggle preview
  const togglePreview = () => {
    setIsPreviewEnabled(!isPreviewEnabled)
    if (!isPreviewEnabled) {
      setTimeout(updatePreview, 100)
    }
  }

  // Toggle auto preview
  const toggleAutoPreview = () => {
    const newValue = !isAutoPreview
    onToggleAutoPreview?.(newValue)
  }

  // Viewport mode styles
  const getViewportStyle = () => {
    const baseStyle = {
      transition: 'all 0.3s ease',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      overflow: 'hidden'
    }

    if (isFullscreen) {
      return {
        ...baseStyle,
        width: '100%',
        height: '100%'
      }
    }

    switch (viewportMode) {
      case 'mobile':
        return {
          ...baseStyle,
          width: '375px',
          height: '667px',
          margin: '0 auto',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }
      case 'tablet':
        return {
          ...baseStyle,
          width: '768px',
          height: '1024px',
          margin: '0 auto',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }
      default:
        return {
          ...baseStyle,
          width: '100%',
          height: '100%'
        }
    }
  }

  return (
    <div className="h-full flex flex-col bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
      {/* Header */}
      <div className="flex-none px-4 py-3 border-b bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Eye className="h-4 w-4 text-purple-600" />
              <div className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-purple-500 rounded-full animate-pulse" />
            </div>
            <h2 className="font-semibold text-sm">라이브 프리뷰</h2>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Viewport controls */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-md p-1">
              <Button
                variant={viewportMode === 'desktop' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewportMode('desktop')}
                className="h-6 w-6 p-0"
              >
                <Monitor className="h-3 w-3" />
              </Button>
              <Button
                variant={viewportMode === 'tablet' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewportMode('tablet')}
                className="h-6 w-6 p-0"
              >
                <Tablet className="h-3 w-3" />
              </Button>
              <Button
                variant={viewportMode === 'mobile' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewportMode('mobile')}
                className="h-6 w-6 p-0"
              >
                <Smartphone className="h-3 w-3" />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-4" />

            {/* Preview controls */}
            <Button
              variant="ghost"
              size="sm"
              onClick={togglePreview}
              className="h-7 px-2 gap-1"
            >
              {isPreviewEnabled ? (
                <>
                  <Pause className="h-3 w-3" />
                  <span className="text-xs">일시정지</span>
                </>
              ) : (
                <>
                  <Play className="h-3 w-3" />
                  <span className="text-xs">재생</span>
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={!isPreviewEnabled || isLoading}
              className="h-7 px-2 gap-1"
            >
              <RotateCcw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="text-xs">새로고침</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-7 px-2 gap-1"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="h-3 w-3" />
                  <span className="text-xs">축소</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-3 w-3" />
                  <span className="text-xs">전체화면</span>
                </>
              )}
            </Button>
          </div>
        </div>
        
        {/* Status bar */}
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Badge 
              variant={isPreviewEnabled ? "default" : "secondary"} 
              className="text-xs gap-1"
            >
              <Zap className="h-2 w-2" />
              {isPreviewEnabled ? "활성화" : "비활성화"}
            </Badge>
            
            {isAutoPreview && (
              <Badge variant="outline" className="text-xs">
                자동 업데이트
              </Badge>
            )}
          </div>
          
          <div className="text-right">
            <span>마지막 업데이트: {lastUpdate.toLocaleTimeString('ko-KR')}</span>
          </div>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 min-h-0 overflow-hidden p-4 bg-gray-50 dark:bg-gray-800/30">
        {isPreviewEnabled ? (
          <div 
            className="h-full flex items-center justify-center"
            style={viewportMode !== 'desktop' ? {} : { padding: '0' }}
          >
            <iframe
              ref={iframeRef}
              style={getViewportStyle()}
              sandbox="allow-scripts allow-same-origin allow-forms"
              title="Live Preview"
              className="bg-white"
              onLoad={() => setIsLoading(false)}
            />
            
            {isLoading && (
              <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm flex items-center justify-center">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  미리보기 업데이트 중...
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Eye className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="font-semibold mb-2">미리보기 비활성화</h3>
              <p className="text-muted-foreground text-sm mb-4">
                코드를 실시간으로 미리보려면 재생 버튼을 클릭하세요
              </p>
              <Button onClick={togglePreview} size="sm" className="gap-2">
                <Play className="h-4 w-4" />
                미리보기 시작
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen overlay */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900">
          <div className="h-full flex flex-col">
            <div className="flex-none p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="font-semibold">전체화면 미리보기</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(false)}
                className="gap-2"
              >
                <Minimize2 className="h-4 w-4" />
                전체화면 종료
              </Button>
            </div>
            <div className="flex-1">
              <iframe
                src={iframeRef.current?.src}
                className="w-full h-full border-none"
                sandbox="allow-scripts allow-same-origin allow-forms"
                title="Fullscreen Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LivePreviewPanel