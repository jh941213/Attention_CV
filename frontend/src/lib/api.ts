import { UserConfig, ChatMessage, CodeGenerationResponse, GitOperationResponse, FileOperation } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

class APIClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async generateCode(
    message: string,
    userConfig: UserConfig,
    conversationHistory: ChatMessage[] = []
  ): Promise<CodeGenerationResponse> {
    return this.request<CodeGenerationResponse>('/chat/generate', {
      method: 'POST',
      body: JSON.stringify({
        message,
        user_config: {
          ai_provider: userConfig.aiProvider,
          api_key: userConfig.apiKey,
          azure_config: userConfig.azureConfig,
          git_config: userConfig.gitConfig,
          session_id: userConfig.sessionId,
        },
        conversation_history: conversationHistory,
      }),
    });
  }

  async applyFeedback(
    feedback: string,
    userConfig: UserConfig,
    targetFiles: string[] = []
  ): Promise<CodeGenerationResponse> {
    return this.request<CodeGenerationResponse>('/chat/feedback', {
      method: 'POST',
      body: JSON.stringify({
        feedback,
        target_files: targetFiles,
        user_config: {
          ai_provider: userConfig.aiProvider,
          api_key: userConfig.apiKey,
          azure_config: userConfig.azureConfig,
          git_config: userConfig.gitConfig,
          session_id: userConfig.sessionId,
        },
      }),
    });
  }

  async continueConversation(
    message: string,
    userConfig: UserConfig,
    context?: string
  ): Promise<CodeGenerationResponse> {
    return this.request<CodeGenerationResponse>('/chat/continue', {
      method: 'POST',
      body: JSON.stringify({
        message,
        context,
        user_config: {
          ai_provider: userConfig.aiProvider,
          api_key: userConfig.apiKey,
          azure_config: userConfig.azureConfig,
          git_config: userConfig.gitConfig,
          session_id: userConfig.sessionId,
        },
      }),
    });
  }

  async commitAndPush(
    files: FileOperation[],
    commitMessage: string,
    userConfig: UserConfig
  ): Promise<GitOperationResponse> {
    return this.request<GitOperationResponse>('/github/commit', {
      method: 'POST',
      body: JSON.stringify({
        user_config: {
          ai_provider: userConfig.aiProvider,
          api_key: userConfig.apiKey,
          git_config: userConfig.gitConfig,
        },
        files,
        commit_message: commitMessage,
      }),
    });
  }

  async validateConfig(userConfig: UserConfig): Promise<{ [key: string]: boolean }> {
    return this.request('/config/validate', {
      method: 'POST',
      body: JSON.stringify({
        ai_provider: userConfig.aiProvider,
        api_key: userConfig.apiKey,
        azure_config: userConfig.azureConfig,
        git_config: userConfig.gitConfig,
        session_id: userConfig.sessionId,
      }),
    });
  }

  async getConversationSummary(sessionId: string): Promise<any> {
    return this.request(`/chat/conversation/${sessionId}`);
  }

  async clearConversation(sessionId: string): Promise<any> {
    return this.request(`/chat/conversation/${sessionId}`, {
      method: 'DELETE',
    });
  }

  async listActiveSessions(): Promise<{ sessions: string[] }> {
    return this.request('/chat/sessions');
  }

  async getRepositoryInfo(
    repositoryUrl: string,
    githubToken: string
  ): Promise<any> {
    const params = new URLSearchParams({
      repo_url: repositoryUrl,
      github_token: githubToken,
    });

    return this.request(`/github/repository/info?${params}`);
  }

  async enableGitHubPages(
    repositoryUrl: string,
    githubToken: string,
    sourceBranch: string = 'main'
  ): Promise<any> {
    const params = new URLSearchParams({
      repo_url: repositoryUrl,
      github_token: githubToken,
      source_branch: sourceBranch,
    });

    return this.request(`/github/pages/enable`, {
      method: 'POST',
      body: JSON.stringify({
        repo_url: repositoryUrl,
        github_token: githubToken,
        source_branch: sourceBranch,
      }),
    });
  }

  async getProjectTemplates(): Promise<{ templates: any[] }> {
    return this.request('/config/templates');
  }

  async getAIProviders(): Promise<{ providers: any[] }> {
    return this.request('/config/ai-providers');
  }
}

export const apiClient = new APIClient();