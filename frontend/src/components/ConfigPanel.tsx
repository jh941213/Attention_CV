'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Settings, Key, Github, Zap, CheckCircle, XCircle, Loader2, Sparkles, Shield, Brain } from 'lucide-react'
import { UserConfig } from '@/types/chat'
import AnimatedBackground from '@/components/ui/animated-background'
import ShinyText from '@/components/ui/shiny-text'
import FloatingLabelInput from '@/components/ui/floating-label-input'
import AnimatedCard from '@/components/ui/animated-card'
import PulseButton from '@/components/ui/pulse-button'
import { AzureLogo, OpenAILogo, ClaudeLogo } from '@/components/ui/vendor-logos'

interface ConfigPanelProps {
  onConfigSave: (config: UserConfig) => void
  initialConfig?: UserConfig | null
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ onConfigSave, initialConfig }) => {
  const [formData, setFormData] = useState<UserConfig>({
    aiProvider: 'azure_openai',
    sessionId: `session-${Date.now()}`,
    openaiModel: 'gpt-4o',
    anthropicModel: 'claude-3.7-sonnet',
    openaiApiKey: '',
    anthropicApiKey: '',
    azureOpenAIConfig: {
      apiKey: '',
      endpoint: '',
      apiVersion: '2024-12-01-preview',
      deploymentName: ''
    },
    gitConfig: {
      repositoryUrl: '',
      token: '',
      branch: 'main',
      username: '',
      email: ''
    },
    ...initialConfig
  })

  const [isValidating, setIsValidating] = useState(false)
  const [validationResults, setValidationResults] = useState<{ [key: string]: boolean }>({})
  const [availableModels, setAvailableModels] = useState<any>({
    openai: [],
    anthropic: []
  })

  // Load available models on component mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/v1/config/models')
        if (response.ok) {
          const data = await response.json()
          setAvailableModels(data.models)
        }
      } catch (error) {
        console.error('Failed to fetch models:', error)
        // Set default models if API fails
        setAvailableModels({
          openai: [
            { id: 'gpt-4.1', name: 'GPT-4.1', description: 'OpenAI GPT 4.1' },
            { id: 'gpt-4.1-mini', name: 'GPT-4.1-MINI', description: 'OpenAI GPT 4.1 Mini' },
            { id: 'gpt-4.1-nano', name: 'GPT-4.1-NANO', description: 'OpenAI GPT 4.1 Nano' },
            { id: 'gpt-5', name: 'GPT-5', description: 'OpenAI GPT 5' },
            { id: 'gpt-4o', name: 'GPT-4O', description: 'OpenAI GPT 4o' },
            { id: 'gpt-4o-mini', name: 'GPT-4O-MINI', description: 'OpenAI GPT 4o Mini' },
          ],
          anthropic: [
            { id: 'claude-3.7-sonnet', name: 'Claude 3.7 Sonnet', description: 'Anthropic Claude 3.7 Sonnet' },
            { id: 'claude-4-sonnet', name: 'Claude 4 Sonnet', description: 'Anthropic Claude 4 Sonnet' },
            { id: 'claude-4-opus', name: 'Claude 4 Opus', description: 'Anthropic Claude 4 Opus' },
          ]
        })
      }
    }
    fetchModels()
  }, [])

  // 자동 검증 제거 - 사용자가 수동으로 설정하도록 변경

  const handleInputChange = (field: string, value: string, parentField?: string) => {
    if (parentField) {
      setFormData(prev => ({
        ...prev,
        [parentField]: {
          ...(prev as any)[parentField],
          [field]: value
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }))
    }
    
    // Clear validation when user types
    if (validationResults[field]) {
      setValidationResults(prev => ({ ...prev, [field]: false }))
    }
  }

  const validateConfig = async () => {
    if (!formData) return false

    setIsValidating(true)
    const results: { [key: string]: boolean } = {}

    try {
      console.log('Validating config:', formData) // 디버깅용

      // Validate AI provider configuration
      if (formData.aiProvider === 'openai' && formData.openaiApiKey) {
        results.openai = true
        console.log('OpenAI validated')
      } else if (formData.aiProvider === 'azure_openai' && formData.azureOpenAIConfig?.apiKey && formData.azureOpenAIConfig?.endpoint) {
        results.azure = true
        console.log('Azure OpenAI validated')
      } else if (formData.aiProvider === 'anthropic' && formData.anthropicApiKey) {
        results.anthropic = true
        console.log('Anthropic validated')
      } else {
        console.log('AI provider validation failed:', {
          provider: formData.aiProvider,
          hasKey: !!(formData.aiProvider === 'openai' ? formData.openaiApiKey : 
                    formData.aiProvider === 'azure_openai' ? formData.azureOpenAIConfig?.apiKey :
                    formData.anthropicApiKey),
          hasEndpoint: formData.aiProvider === 'azure_openai' ? !!formData.azureOpenAIConfig?.endpoint : true
        })
      }

      // Validate Git configuration
      if (formData.gitConfig?.repositoryUrl && formData.gitConfig?.token) {
        results.git = true
        console.log('Git validated')
      } else {
        console.log('Git validation failed:', {
          hasRepo: !!formData.gitConfig?.repositoryUrl,
          hasToken: !!formData.gitConfig?.token
        })
      }

      setValidationResults(results)
      const hasValidation = Object.values(results).some(Boolean) && results.git && (results.openai || results.azure || results.anthropic)
      console.log('Final validation result:', hasValidation, results)
      return hasValidation
    } catch (error) {
      console.error('Validation error:', error)
      return false
    } finally {
      setIsValidating(false)
    }
  }

  const handleSave = async () => {
    console.log('Save button clicked')
    
    // 자동으로 검증부터 실행
    const isValid = await validateConfig()
    console.log('Validation result:', isValid)
    
    if (isValid) {
      console.log('Config is valid, calling onConfigSave')
      onConfigSave(formData)
    } else {
      console.log('Config is invalid, showing validation results')
      // 검증 결과가 이미 표시되므로 추가 작업 불필요
    }
  }

  const renderValidationIcon = (field: string) => {
    if (isValidating) return <Loader2 className="w-4 h-4 animate-spin" />
    if (validationResults[field]) return <CheckCircle className="w-4 h-4 text-green-500" />
    if (validationResults[field] === false) return <XCircle className="w-4 h-4 text-red-500" />
    return null
  }

  return (
    <AnimatedBackground className="min-h-screen w-full" particleCount={20} particleColor="#3b82f6">
      <div className="min-h-screen w-full bg-gradient-to-br from-background/95 via-background/90 to-muted/40 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto p-6 space-y-8">
          <div className="text-center py-12">
            <div className="relative inline-block">
              {/* Main Title with Better Visibility */}
              <h1 className="text-4xl font-bold flex items-center justify-center gap-4 mb-6">
                <div className="text-gray-900 dark:text-white">
                  <ShinyText 
                    text="GitHub Pages AI Generator" 
                    speed={8}
                    intensity="high"
                    className="text-4xl font-display font-bold tracking-wide"
                  />
                </div>
              </h1>
              
              {/* Subtitle */}
              <div className="relative mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4 font-body">
                  환경 설정
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed font-body">
                  AI 모델과 GitHub 저장소를 연결하여 자동화된 웹사이트 생성을 시작하세요
                </p>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 blur-3xl -z-10" />
              </div>
            </div>
          </div>

          {/* AI Provider Configuration */}
          <AnimatedCard 
            title="AI 모델 설정"
            titleIcon={
              <div className="relative">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                  {formData.aiProvider === 'azure_openai' ? (
                    <AzureLogo className="w-4 h-4" />
                  ) : formData.aiProvider === 'openai' ? (
                    <OpenAILogo className="w-4 h-4" />
                  ) : formData.aiProvider === 'anthropic' ? (
                    <ClaudeLogo className="w-4 h-4" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              </div>
            }
            validationIcon={renderValidationIcon('azure') || renderValidationIcon('openai') || renderValidationIcon('anthropic')}
            delay={200}
          >
            {/* AI Provider Selection */}
            <div>
              <Label htmlFor="aiProvider" className="text-sm font-semibold mb-3 block text-gray-800 dark:text-gray-200">
                AI 제공업체
              </Label>
              <Select 
                value={formData.aiProvider} 
                onValueChange={(value) => handleInputChange('aiProvider', value)}
              >
                <SelectTrigger className="h-12 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-white/30 dark:border-gray-700/40 hover:bg-white/90 dark:hover:bg-gray-900/90 transition-all duration-300 text-gray-900 dark:text-gray-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-white/30 dark:border-gray-700/40">
                  <SelectItem value="azure_openai" className="hover:bg-blue-100/70 dark:hover:bg-blue-900/30 text-gray-900 dark:text-gray-100">
                    <div className="flex items-center gap-3">
                      <AzureLogo className="w-5 h-5" />
                      <span className="font-medium">Azure OpenAI (권장)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="openai" className="hover:bg-green-100/70 dark:hover:bg-green-900/30 text-gray-900 dark:text-gray-100">
                    <div className="flex items-center gap-3">
                      <OpenAILogo className="w-5 h-5" />
                      <span className="font-medium">OpenAI</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="anthropic" className="hover:bg-orange-100/70 dark:hover:bg-orange-900/30 text-gray-900 dark:text-gray-100">
                    <div className="flex items-center gap-3">
                      <ClaudeLogo className="w-5 h-5" />
                      <span className="font-medium">Anthropic Claude</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Azure OpenAI Configuration */}
            {formData.aiProvider === 'azure_openai' && (
              <div className="space-y-4 p-6 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl backdrop-blur-sm border border-blue-200/50 dark:border-blue-700/30">
                <FloatingLabelInput
                  label="Azure OpenAI API 키"
                  type="password"
                  value={formData.azureOpenAIConfig?.apiKey || ''}
                  onChange={(e) => handleInputChange('apiKey', e.target.value, 'azureOpenAIConfig')}
                  icon={<AzureLogo className="w-4 h-4" />}
                  validationIcon={renderValidationIcon('azure')}
                />
                
                <FloatingLabelInput
                  label="Azure 엔드포인트"
                  value={formData.azureOpenAIConfig?.endpoint || ''}
                  onChange={(e) => handleInputChange('endpoint', e.target.value, 'azureOpenAIConfig')}
                  icon={<AzureLogo className="w-4 h-4" />}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FloatingLabelInput
                    label="API 버전"
                    value={formData.azureOpenAIConfig?.apiVersion || ''}
                    onChange={(e) => handleInputChange('apiVersion', e.target.value, 'azureOpenAIConfig')}
                  />
                  
                  <FloatingLabelInput
                    label="배포명"
                    value={formData.azureOpenAIConfig?.deploymentName || ''}
                    onChange={(e) => handleInputChange('deploymentName', e.target.value, 'azureOpenAIConfig')}
                  />
                </div>
              </div>
            )}

            {/* OpenAI Configuration */}
            {formData.aiProvider === 'openai' && (
              <div className="space-y-4 p-6 bg-gradient-to-br from-green-50/80 to-emerald-50/80 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl backdrop-blur-sm border border-green-200/50 dark:border-green-700/30">
                <div className="space-y-2">
                  <Label htmlFor="openaiModel" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <OpenAILogo className="w-4 h-4" />
                    OpenAI 모델
                  </Label>
                  <Select value={formData.openaiModel || 'gpt-4o'} onValueChange={(value) => handleInputChange('openaiModel', value)}>
                    <SelectTrigger className="bg-white/70 dark:bg-gray-800/70 border-green-200 dark:border-green-700 focus:border-green-400">
                      <SelectValue placeholder="모델을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.openai && availableModels.openai.length > 0 ? (
                        availableModels.openai.map((model: any) => (
                          <SelectItem key={model.id} value={model.id} className="hover:bg-green-100/70 dark:hover:bg-green-900/30">
                            <div className="flex flex-col">
                              <span className="font-medium">{model.name}</span>
                              <span className="text-xs text-gray-500">{model.description}</span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="gpt-4o" disabled>모델 로딩 중...</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <FloatingLabelInput
                  label="OpenAI API 키"
                  type="password"
                  value={formData.openaiApiKey || ''}
                  onChange={(e) => handleInputChange('openaiApiKey', e.target.value)}
                  icon={<OpenAILogo className="w-4 h-4" />}
                  validationIcon={renderValidationIcon('openai')}
                />
              </div>
            )}

            {/* Anthropic Configuration */}
            {formData.aiProvider === 'anthropic' && (
              <div className="space-y-4 p-6 bg-gradient-to-br from-orange-50/80 to-amber-50/80 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl backdrop-blur-sm border border-orange-200/50 dark:border-orange-700/30">
                <div className="space-y-2">
                  <Label htmlFor="anthropicModel" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <ClaudeLogo className="w-4 h-4" />
                    Anthropic 모델
                  </Label>
                  <Select value={formData.anthropicModel || 'claude-3.7-sonnet'} onValueChange={(value) => handleInputChange('anthropicModel', value)}>
                    <SelectTrigger className="bg-white/70 dark:bg-gray-800/70 border-orange-200 dark:border-orange-700 focus:border-orange-400">
                      <SelectValue placeholder="모델을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.anthropic && availableModels.anthropic.length > 0 ? (
                        availableModels.anthropic.map((model: any) => (
                          <SelectItem key={model.id} value={model.id} className="hover:bg-orange-100/70 dark:hover:bg-orange-900/30">
                            <div className="flex flex-col">
                              <span className="font-medium">{model.name}</span>
                              <span className="text-xs text-gray-500">{model.description}</span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="claude-3.7-sonnet" disabled>모델 로딩 중...</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <FloatingLabelInput
                  label="Anthropic API 키"
                  type="password"
                  value={formData.anthropicApiKey || ''}
                  onChange={(e) => handleInputChange('anthropicApiKey', e.target.value)}
                  icon={<ClaudeLogo className="w-4 h-4" />}
                  validationIcon={renderValidationIcon('anthropic')}
                />
              </div>
            )}
          </AnimatedCard>

          {/* GitHub Configuration */}
          <AnimatedCard 
            title="GitHub 저장소 설정"
            titleIcon={
              <div className="relative">
                <div className="w-6 h-6 bg-gradient-to-br from-gray-700 to-gray-900 dark:from-gray-600 dark:to-gray-800 rounded-lg flex items-center justify-center shadow-sm">
                  <Github className="w-4 h-4 text-white" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              </div>
            }
            validationIcon={renderValidationIcon('git')}
            delay={400}
          >
            <FloatingLabelInput
              label="저장소 URL"
              value={formData.gitConfig?.repositoryUrl || ''}
              onChange={(e) => handleInputChange('repositoryUrl', e.target.value, 'gitConfig')}
              icon={<Github className="w-4 h-4" />}
            />
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 ml-1 bg-white/50 dark:bg-gray-800/50 px-2 py-1 rounded backdrop-blur-sm">
              GitHub Pages 저장소 URL (*.github.io 권장)
            </p>

            <FloatingLabelInput
              label="GitHub 토큰"
              type="password"
              value={formData.gitConfig?.token || ''}
              onChange={(e) => handleInputChange('token', e.target.value, 'gitConfig')}
              icon={<Key className="w-4 h-4" />}
              validationIcon={renderValidationIcon('git')}
            />
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 ml-1 bg-white/50 dark:bg-gray-800/50 px-2 py-1 rounded backdrop-blur-sm">
              GitHub Personal Access Token (repo 권한 필요)
            </p>

            <div className="grid grid-cols-3 gap-4">
              <FloatingLabelInput
                label="브랜치"
                value={formData.gitConfig?.branch || 'main'}
                onChange={(e) => handleInputChange('branch', e.target.value, 'gitConfig')}
              />
              
              <FloatingLabelInput
                label="사용자명"
                value={formData.gitConfig?.username || ''}
                onChange={(e) => handleInputChange('username', e.target.value, 'gitConfig')}
              />
              
              <FloatingLabelInput
                label="이메일"
                type="email"
                value={formData.gitConfig?.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value, 'gitConfig')}
              />
            </div>
          </AnimatedCard>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 py-8">
            <PulseButton 
              variant="outline" 
              onClick={validateConfig}
              disabled={isValidating}
              loading={isValidating}
              glowEffect={true}
              size="lg"
              className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-gray-300/50 dark:border-gray-600/50 text-gray-700 dark:text-gray-200 hover:bg-gray-50/80 dark:hover:bg-gray-700/80 shadow-lg"
            >
              {isValidating ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <CheckCircle className="w-5 h-5 mr-2 text-blue-600" />
              )}
              <span className="font-semibold">설정 검증</span>
            </PulseButton>
            
            <PulseButton 
              variant="primary"
              onClick={handleSave}
              disabled={isValidating}
              loading={isValidating}
              size="lg"
              pulseColor="success"
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/25 border-0"
            >
              {isValidating ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Key className="w-5 h-5 mr-2" />
              )}
              <span className="font-semibold">
                {isValidating ? '검증 중...' : '설정 저장 및 시작'}
              </span>
            </PulseButton>
          </div>

          {/* Validation Results */}
          {Object.keys(validationResults).length > 0 && (
            <AnimatedCard
              title="검증 결과"
              titleIcon={<CheckCircle className="w-5 h-5 text-green-600" />}
              delay={600}
              className="border-green-200/50 dark:border-green-700/30 bg-green-50/30 dark:bg-green-900/10"
            >
              <div className="grid grid-cols-2 gap-3 text-sm">
                {validationResults.azure && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-green-100/50 dark:bg-green-900/20 animate-in fade-in-0 slide-in-from-left-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="font-medium">Azure OpenAI 연결 완료</span>
                  </div>
                )}
                {validationResults.openai && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-green-100/50 dark:bg-green-900/20 animate-in fade-in-0 slide-in-from-left-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="font-medium">OpenAI 연결 완료</span>
                  </div>
                )}
                {validationResults.anthropic && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-green-100/50 dark:bg-green-900/20 animate-in fade-in-0 slide-in-from-left-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="font-medium">Anthropic 연결 완료</span>
                  </div>
                )}
                {validationResults.git && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-green-100/50 dark:bg-green-900/20 animate-in fade-in-0 slide-in-from-left-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="font-medium">GitHub 저장소 연결 완료</span>
                  </div>
                )}
              </div>
            </AnimatedCard>
          )}
        </div>
      </div>
    </AnimatedBackground>
  )
}

export default ConfigPanel