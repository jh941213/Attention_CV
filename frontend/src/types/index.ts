export interface AzureOpenAIConfig {
  apiKey: string;
  azureEndpoint: string;
  apiVersion: string;
  deploymentName: string;
}

export interface UserConfig {
  aiProvider: 'openai' | 'azure_openai' | 'anthropic';
  apiKey: string;
  azureConfig?: AzureOpenAIConfig;
  gitConfig: {
    username: string;
    email: string;
    githubToken: string;
    repositoryUrl: string;
  };
  sessionId: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface FileOperation {
  operation: 'create' | 'update' | 'delete';
  filePath: string;
  content?: string;
}

export interface CodeGenerationResponse {
  message: string;
  files: FileOperation[];
  commitMessage?: string;
  explanation?: string;
}

export interface GitOperationResponse {
  success: boolean;
  message: string;
  commitSha?: string;
  pagesUrl?: string;
}