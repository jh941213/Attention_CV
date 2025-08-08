// User configuration types
export interface AzureOpenAIConfig {
  apiKey: string
  endpoint: string
  apiVersion: string
  deploymentName: string
}

export interface GitConfig {
  repositoryUrl: string
  token: string
  branch: string
  username: string
  email: string
}

export interface UserConfig {
  aiProvider: 'openai' | 'azure_openai' | 'anthropic'
  sessionId: string
  openaiModel?: string
  anthropicModel?: string
  openaiApiKey?: string
  anthropicApiKey?: string
  azureOpenAIConfig?: AzureOpenAIConfig
  gitConfig: GitConfig
}

// Chat message types
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  files?: FileOperation[]
  commitMessage?: string
}

export interface FileOperation {
  filename: string
  content: string
  language: string
  operation?: string
  file_path?: string
}

// API request/response types
export interface CodeGenerationResponse {
  message: string
  files: FileOperation[]
  commitMessage: string
  explanation?: string
}

export interface CodeOnlyRequest {
  prompt: string
  config: UserConfig
  language?: string
  filename?: string
}

export interface CodeOnlyResponse {
  code: string
  language: string
  filename: string
  explanation?: string
}

export interface GitOperationResponse {
  success: boolean
  message: string
  commit_sha?: string
  pages_url?: string
}