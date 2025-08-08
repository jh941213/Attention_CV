from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from enum import Enum


class AIProvider(str, Enum):
    OPENAI = "openai"
    AZURE_OPENAI = "azure_openai"
    ANTHROPIC = "anthropic"


class OpenAIModel(str, Enum):
    GPT_4_1 = "gpt-4.1"
    GPT_4_1_MINI = "gpt-4.1-mini"
    GPT_4_1_NANO = "gpt-4.1-nano"
    GPT_5 = "gpt-5"
    GPT_4O = "gpt-4o"
    GPT_4O_MINI = "gpt-4o-mini"


class AnthropicModel(str, Enum):
    CLAUDE_3_7_SONNET = "claude-3.7-sonnet"
    CLAUDE_4_SONNET = "claude-4-sonnet"
    CLAUDE_4_OPUS = "claude-4-opus"


class GitConfig(BaseModel):
    repositoryUrl: str = Field(..., description="GitHub repository URL")
    token: str = Field(..., description="GitHub personal access token")
    branch: str = Field(default="main", description="Git branch to use")
    username: Optional[str] = Field(None, description="Git username")
    email: Optional[str] = Field(None, description="Git email")


class AzureOpenAIConfig(BaseModel):
    apiKey: str = Field(..., description="Azure OpenAI API key")
    endpoint: str = Field(..., description="Azure OpenAI endpoint URL")
    apiVersion: str = Field(default="2024-08-01-preview", description="Azure OpenAI API version")
    deploymentName: str = Field(..., description="Azure OpenAI deployment name")


class UserConfig(BaseModel):
    aiProvider: AIProvider = Field(default=AIProvider.OPENAI, description="AI provider to use")
    sessionId: str = Field(default="default", description="Session ID for conversation memory")
    
    # Model Selection
    openaiModel: Optional[OpenAIModel] = Field(default=OpenAIModel.GPT_4O, description="OpenAI model to use")
    anthropicModel: Optional[AnthropicModel] = Field(default=AnthropicModel.CLAUDE_3_7_SONNET, description="Anthropic model to use")
    
    # API Keys
    openaiApiKey: Optional[str] = Field(None, description="OpenAI API key")
    anthropicApiKey: Optional[str] = Field(None, description="Anthropic API key")
    
    # Azure OpenAI Configuration
    azureOpenAIConfig: Optional[AzureOpenAIConfig] = Field(None, description="Azure OpenAI configuration")
    
    # Git Configuration
    gitConfig: GitConfig = Field(..., description="Git configuration")
    
    @field_validator('gitConfig')
    @classmethod
    def validate_github_url(cls, v):
        if not v.repositoryUrl.startswith(('https://github.com/', 'git@github.com:')):
            raise ValueError('Repository URL must be a valid GitHub URL')
        return v


class ChatMessage(BaseModel):
    role: str = Field(..., description="Message role (user/assistant/system)")
    content: str = Field(..., description="Message content")
    timestamp: Optional[str] = Field(None, description="Message timestamp")


# Request/Response models for API endpoints
class GenerateRequest(BaseModel):
    prompt: str = Field(..., description="User prompt for code generation")
    config: UserConfig = Field(..., description="User configuration")


class FeedbackRequest(BaseModel):
    feedback: str = Field(..., description="User feedback on generated code")
    config: UserConfig = Field(..., description="User configuration")


class ChatMessage(BaseModel):
    role: str = Field(..., description="Message role (user/assistant/system)")
    content: str = Field(..., description="Message content")
    timestamp: Optional[str] = Field(None, description="Message timestamp")


class FileOperation(BaseModel):
    filename: str = Field(..., description="Relative file path")
    content: str = Field(..., description="File content")
    language: Optional[str] = Field("html", description="Programming language for syntax highlighting")
    operation: Optional[str] = Field("create", description="File operation type (create, update, delete)")
    file_path: Optional[str] = Field(None, description="File path for Git operations")
    
    def model_post_init(self, __context) -> None:
        # Ensure file_path is set to filename if not provided
        if not self.file_path:
            self.file_path = self.filename


class CodeGenerationResponse(BaseModel):
    message: str = Field(..., description="AI response message")
    files: List[FileOperation] = Field(default=[], description="Files to be created/modified")
    commitMessage: Optional[str] = Field(None, description="Suggested commit message")
    explanation: Optional[str] = Field(None, description="Explanation of changes")


class GitOperationRequest(BaseModel):
    config: UserConfig = Field(..., description="User configuration")
    files: List[FileOperation] = Field(..., description="Files to commit")
    commitMessage: str = Field(..., description="Commit message")


class GitOperationResponse(BaseModel):
    success: bool = Field(..., description="Operation success status")
    message: str = Field(..., description="Operation result message")
    commit_sha: Optional[str] = Field(None, description="Commit SHA if successful")
    pages_url: Optional[str] = Field(None, description="GitHub Pages URL if available")


class ErrorResponse(BaseModel):
    error: str = Field(..., description="Error message")


# Code-only generation models
class CodeOnlyRequest(BaseModel):
    prompt: str = Field(..., description="User prompt for code generation")
    config: UserConfig = Field(..., description="User configuration")
    language: Optional[str] = Field("html", description="Target programming language")
    filename: Optional[str] = Field("index.html", description="Target filename")
    currentCode: Optional[str] = Field(None, description="Current code in the editor for context")
    sessionId: Optional[str] = Field(None, description="Session ID to access chat history")


class CodeOnlyResponse(BaseModel):
    code: str = Field(..., description="Generated code content")
    language: str = Field(..., description="Programming language")
    filename: str = Field(..., description="Filename")
    explanation: Optional[str] = Field(None, description="Brief explanation of the code")
    detail: Optional[str] = Field(None, description="Detailed error information")


# Code Update Operations
class CodeOperation(BaseModel):
    """Individual code operation for incremental updates"""
    operation: str = Field(..., description="Operation type: replace, insert, delete, append, prepend")
    target: str = Field(..., description="Target location: line number, function name, or selector")
    old_content: Optional[str] = Field(None, description="Content to be replaced (for replace operations)")
    new_content: str = Field(..., description="New content to insert/replace")
    line_start: Optional[int] = Field(None, description="Start line number for operation")
    line_end: Optional[int] = Field(None, description="End line number for operation")


class IncrementalCodeUpdate(BaseModel):
    """Model for incremental code updates"""
    update_type: str = Field(..., description="Type of update: incremental, full_replace, or streaming")
    operations: List[CodeOperation] = Field(default=[], description="List of code operations to perform")
    explanation: str = Field(..., description="Explanation of what changes are being made")
    estimated_impact: str = Field("low", description="Estimated impact: low, medium, high")


# LangGraph Supervisor models
class SupervisorRequest(BaseModel):
    """Request model for LangGraph supervisor routing"""
    prompt: str = Field(..., description="User input message")
    config: UserConfig = Field(..., description="User configuration")
    session_id: Optional[str] = Field(None, description="Session ID for conversation memory")
    currentCode: Optional[str] = Field(None, description="Current code in editor for context")
    currentFilename: Optional[str] = Field(None, description="Current filename in editor")
    currentLanguage: Optional[str] = Field(None, description="Current language in editor")
    enable_incremental_updates: Optional[bool] = Field(True, description="Enable incremental code updates")


class SupervisorResponse(BaseModel):
    """Response model for LangGraph supervisor routing"""
    request_type: str = Field(..., description="Classified request type (chat/code)")
    confidence: float = Field(..., description="Classification confidence score")
    reasoning: str = Field(..., description="Classification reasoning")
    response: str = Field(..., description="Generated response text")
    generated_code: str = Field("", description="Generated code if applicable")
    filename: str = Field("index.html", description="Suggested filename if code generated")
    language: str = Field("html", description="Programming language if code generated")
    incremental_update: Optional[IncrementalCodeUpdate] = Field(None, description="Incremental code updates if applicable")
    success: bool = Field(True, description="Processing success status")