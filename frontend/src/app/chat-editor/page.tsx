'use client'

import React, { useState, useEffect } from 'react'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import Chat from '@/components/Chat'
import CodeEditor from '@/components/CodeEditor'
import CodeDiffViewer from '@/components/CodeDiffViewer'
import ConfigPanel from '@/components/ConfigPanel'
import { UserConfig } from '@/types/chat'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Settings, MessageSquare, Code2, GitBranch, Sparkles, Bot, Zap, Home } from 'lucide-react'
import AnimatedBackground from '@/components/ui/animated-background'
import BlurText from '@/components/ui/blur-text'
import GradientText from '@/components/ui/gradient-text'
import LiveClock from '@/components/ui/live-clock'
import { ToastProvider, useToast } from '@/components/ui/toast'

interface ChatEditorPageProps {}

const ChatEditorPageContent: React.FC<ChatEditorPageProps> = () => {
  const toast = useToast()
  const [userConfig, setUserConfig] = useState<UserConfig | null>(null)
  const [showConfig, setShowConfig] = useState(false)
  const [isValidConfig, setIsValidConfig] = useState(false)

  // Code editor state
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('html')
  const [filename, setFilename] = useState('index.html')
  const [isGeneratingCode, setIsGeneratingCode] = useState(false)

  // Code diff state
  const [showDiff, setShowDiff] = useState(false)
  const [lastChanges, setLastChanges] = useState<any[]>([])
  const [lastOriginalCode, setLastOriginalCode] = useState('')

  // Chat state - removed unused state

  useEffect(() => {
    // Load saved config from localStorage
    const savedConfig = localStorage.getItem('github-pages-config')
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig)
        setUserConfig(config)
        setIsValidConfig(validateConfig(config))
      } catch (error) {
        console.error('Failed to parse saved config:', error)
      }
    } else {
      setShowConfig(true)
    }
  }, [])

  const validateConfig = (config: UserConfig): boolean => {
    if (!config) return false
    
    const hasAIProvider = config.aiProvider && (
      (config.aiProvider === 'openai' && config.openaiApiKey) ||
      (config.aiProvider === 'azure_openai' && config.azureOpenAIConfig?.apiKey) ||
      (config.aiProvider === 'anthropic' && config.anthropicApiKey)
    )
    
    const hasGitConfig = config.gitConfig?.repositoryUrl && config.gitConfig?.token
    
    return !!(hasAIProvider && hasGitConfig)
  }

  const handleConfigSave = (config: UserConfig) => {
    console.log('Config saved:', config) // 디버깅용
    setUserConfig(config)
    const isValid = validateConfig(config)
    setIsValidConfig(isValid)
    
    localStorage.setItem('github-pages-config', JSON.stringify(config))
    
    // 설정이 유효하면 메인 화면으로 이동
    if (isValid) {
      setShowConfig(false)
    } else {
      console.log('Config validation failed:', { hasAIProvider: checkAIProvider(config), hasGitConfig: checkGitConfig(config) })
    }
  }

  // 디버깅을 위한 헬퍼 함수들
  const checkAIProvider = (config: UserConfig) => {
    return config.aiProvider && (
      (config.aiProvider === 'openai' && config.openaiApiKey) ||
      (config.aiProvider === 'azure_openai' && config.azureOpenAIConfig?.apiKey) ||
      (config.aiProvider === 'anthropic' && config.anthropicApiKey)
    )
  }

  const checkGitConfig = (config: UserConfig) => {
    return config.gitConfig?.repositoryUrl && config.gitConfig?.token
  }

  const handleGenerateCode = async (prompt: string) => {
    if (!userConfig) {
      toast.warning('코드 생성 실패', '설정이 없습니다.')
      return
    }

    setIsGeneratingCode(true)
    toast.info('코드 생성 중...', 'AI가 코드를 생성하고 있습니다.')

    try {
      const response = await fetch('http://localhost:8000/api/v1/chat/generate-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          config: userConfig,
          language,
          filename,
          currentCode: code, // 현재 에디터의 코드를 컨텍스트로 전송
          sessionId: userConfig.sessionId || 'default' // 채팅 세션 ID 전송
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      setCode(result.code)
      setLanguage(result.language)
      setFilename(result.filename)
      
      toast.success('코드 생성 완료!', `${result.filename} 파일이 생성되었습니다.`)
      
    } catch (error) {
      console.error('코드 생성 실패:', error)
      toast.error(
        '코드 생성 실패',
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        {
          label: '다시 시도',
          onClick: () => handleGenerateCode(prompt)
        }
      )
    } finally {
      setIsGeneratingCode(false)
    }
  }

  const handleCommitCode = async () => {
    if (!userConfig || !code) {
      toast.warning('커밋 실패', '설정 또는 코드가 없습니다.')
      return
    }

    // Show loading toast
    toast.info('커밋 진행 중...', 'GitHub에 코드를 업로드하고 있습니다.')

    try {
      // Create a file operation for the current code
      const fileOperation = {
        filename,
        content: code,
        language,
        operation: 'create',
        file_path: filename
      }

      // Commit using the GitHub service
      const response = await fetch('http://localhost:8000/api/v1/git/commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: userConfig,
          files: [fileOperation],
          commitMessage: `Update ${filename} via code editor`
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('Commit successful:', result)
      
      // Extract GitHub Pages URL from repository URL
      const repoUrl = userConfig.gitConfig?.repositoryUrl || ''
      const githubPagesUrl = repoUrl.replace('github.com', 'github.io').replace('.git', '')
      
      // Show success toast with action
      toast.success(
        '커밋 성공! ✨',
        `${filename}이(가) 성공적으로 배포되었습니다.`,
        {
          label: '사이트 보기',
          onClick: () => window.open(githubPagesUrl, '_blank')
        }
      )
      
    } catch (error) {
      console.error('커밋 실패:', error)
      toast.error(
        '커밋 실패',
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        {
          label: '다시 시도',
          onClick: () => handleCommitCode()
        }
      )
    }
  }

  if (showConfig || !isValidConfig) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-2xl mx-auto">
          {!isValidConfig && userConfig && (
            <div className="mb-4 p-4 bg-amber-100 border border-amber-300 rounded-lg">
              <p className="text-amber-800 text-sm">
                ⚠️ 설정이 완전하지 않습니다. 모든 필수 항목을 입력해주세요.
              </p>
            </div>
          )}
          <ConfigPanel
            onConfigSave={handleConfigSave}
            initialConfig={userConfig}
          />
        </div>
      </div>
    )
  }

  return (
    <AnimatedBackground className="h-screen w-full" particleCount={30} particleColor="#3b82f6">
      <div className="h-screen w-full bg-gradient-to-br from-background/90 via-background/80 to-muted/30 flex flex-col overflow-hidden backdrop-blur-sm">
        {/* Fixed header with unified glass effect */}
        <div className="flex-none w-full border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl backdrop-saturate-150 shadow-lg border-white/30">
          <div className="flex h-16 items-center px-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <GitBranch className="h-7 w-7 text-primary drop-shadow-sm" />
                  <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-blue-400 animate-pulse" />
                </div>
                <div>
                  <h1 className="text-xl text-gray-900 dark:text-white drop-shadow-sm">
                    <button 
                      onClick={() => window.location.reload()}
                      className="font-display font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 transition-all duration-200 cursor-pointer tracking-wide"
                    >
                      Attention CV
                    </button>
                  </h1>
                </div>
              </div>
            
            {userConfig?.gitConfig?.repositoryUrl && (
              <>
                <Separator orientation="vertical" className="h-6" />
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="gap-1 font-mono text-xs">
                    <Bot className="h-3 w-3" />
                    {userConfig.gitConfig.repositoryUrl.split('/').slice(-2).join('/')}
                  </Badge>
                </div>
              </>
            )}
          </div>
          
          <div className="flex-1" />
          
          <div className="flex items-center gap-4">
            <LiveClock className="text-muted-foreground" showSeconds={true} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = '/'}
              className="gap-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/30"
            >
              <Home className="h-4 w-4" />
              홈
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowConfig(true)}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              설정
            </Button>
          </div>
        </div>
      </div>

      {/* Main layout - 2-Panel */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full w-full">
          {/* Left panel - Chat */}
          <ResizablePanel defaultSize={50} minSize={30} maxSize={70}>
            <div className="h-full flex flex-col bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
              <div className="flex-none px-4 py-3 border-b bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <MessageSquare className="h-4 w-4 text-green-600" />
                      <div className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                    </div>
                    <h2 className="font-semibold text-sm">
                      <BlurText text="AI 채팅" delay={50} />
                    </h2>
                  </div>
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Bot className="h-3 w-3" />
                    대화형
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 pl-6">
                  AI와 자연스럽게 대화하며 웹사이트를 기획하고 개발하세요
                </p>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden relative">
                <Chat 
                  userConfig={userConfig}
                  currentCode={code}
                  currentFilename={filename}
                  currentLanguage={language}
                  onCodeGenerated={(generatedCode) => {
                    // Handle incremental updates
                    if (generatedCode.incremental_update) {
                      const { applyIncrementalUpdates, generateChangeDescription } = require('@/utils/codeUpdater')
                      
                      const result = applyIncrementalUpdates(code, generatedCode.incremental_update)
                      
                      if (result.success) {
                        // Store original code for diff
                        setLastOriginalCode(code)
                        
                        // Update code
                        setCode(result.updatedCode)
                        
                        // Store changes for diff viewer
                        setLastChanges(result.changes)
                        
                        // Show diff viewer
                        setShowDiff(true)
                        
                        // Show a subtle notification about the changes
                        const changeDesc = generateChangeDescription(result.changes)
                        console.log(`Open Canvas: ${changeDesc}`)
                        
                        // Optional: Show a toast notification
                        // toast.success(`코드 업데이트: ${changeDesc}`)
                      } else {
                        console.error('Failed to apply incremental updates:', result.error)
                        // Fallback: ask user if they want to see the full response
                        if (window.confirm(`코드 업데이트에 실패했습니다.\n오류: ${result.error}\n\n전체 응답을 확인하시겠습니까?`)) {
                          console.log('Incremental update failed:', generatedCode.incremental_update)
                        }
                      }
                    }
                    // Handle full code generation
                    else if (generatedCode.files && generatedCode.files.length > 0) {
                      const firstFile = generatedCode.files[0]
                      
                      // Check if there's existing code to prevent accidental overwrites
                      if (code && code.trim() && !code.includes('Hello World')) {
                        // If there's substantial existing code, show a confirmation
                        const confirmOverwrite = window.confirm(
                          `현재 에디터에 작업 중인 코드가 있습니다.\n새로운 코드로 교체하시겠습니까?\n\n현재 파일: ${filename}\n새 파일: ${firstFile.filename}`
                        )
                        
                        if (!confirmOverwrite) {
                          return // Don't overwrite if user cancels
                        }
                      }
                      
                      setCode(firstFile.content)
                      setFilename(firstFile.filename)
                      setLanguage(firstFile.language || 'html')
                    }
                  }}
                />
                
                {/* Floating Code Diff Viewer */}
                {showDiff && lastChanges.length > 0 && (
                  <div className="absolute bottom-4 right-4 w-80 max-h-96 z-10">
                    <CodeDiffViewer
                      changes={lastChanges}
                      originalCode={lastOriginalCode}
                      updatedCode={code}
                      isVisible={showDiff}
                      onToggleVisibility={setShowDiff}
                      onClose={() => {
                        setShowDiff(false)
                        setLastChanges([])
                        setLastOriginalCode('')
                      }}
                      className="shadow-2xl"
                    />
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle className="w-2 bg-gradient-to-b from-gray-300/60 to-gray-400/60 dark:from-gray-600/60 dark:to-gray-500/60 hover:from-primary/50 hover:to-primary/70 transition-all duration-200 backdrop-blur-sm border-l border-r border-gray-200/50 dark:border-gray-700/50 shadow-sm" />

          {/* Right panel - Code Editor */}
          <ResizablePanel defaultSize={50} minSize={30} maxSize={70}>
            <div className="h-full flex flex-col bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-l border-gray-200/50 dark:border-gray-700/50">
              <div className="flex-none px-4 py-3 border-b bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Code2 className="h-4 w-4 text-blue-600" />
                      <div className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
                    </div>
                    <h2 className="font-semibold text-sm">
                      <BlurText text="코드 에디터" delay={50} />
                    </h2>
                  </div>
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Zap className="h-3 w-3" />
                    생성형
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 pl-6">
                  코드를 직접 편집하고 실시간으로 GitHub에 배포하세요
                </p>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <CodeEditor
                  code={code}
                  language={language}
                  filename={filename}
                  onCodeChange={setCode}
                  onLanguageChange={setLanguage}
                  onFilenameChange={setFilename}
                  onGenerateCode={handleGenerateCode}
                  onCommitCode={handleCommitCode}
                  userConfig={userConfig}
                  isLoading={isGeneratingCode}
                />
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Config modal with consistent styling */}
      {showConfig && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-in fade-in-0">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto shadow-2xl border-white/20 animate-in zoom-in-95 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl">
            <div className="relative">
              <ConfigPanel
                onConfigSave={handleConfigSave}
                initialConfig={userConfig}
              />
            </div>
          </Card>
        </div>
      )}
      </div>
    </AnimatedBackground>
  )
}

const ChatEditorPage: React.FC<ChatEditorPageProps> = () => {
  return (
    <ToastProvider>
      <ChatEditorPageContent />
    </ToastProvider>
  )
}

export default ChatEditorPage