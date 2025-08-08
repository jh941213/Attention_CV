"""Unified AI Service combining all AI-related functionality"""

import logging
from typing import Dict, List, Optional, Any, AsyncGenerator
from abc import ABC, abstractmethod
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from langchain_openai import AzureChatOpenAI, ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain.schema import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.callbacks.streaming_stdout import StreamingStdOutCallbackHandler
import asyncio

from ...models.schemas import UserConfig, SupervisorRequest, FileOperation
from ..data.memory_service import memory_service
from ..data.document_service import document_service
from .supervisor import Supervisor

logger = logging.getLogger(__name__)


class BaseAIService(ABC):
    """Abstract base class for AI services"""
    
    @abstractmethod
    def create_llm(self, config: UserConfig):
        """Create LLM instance based on configuration"""
        pass
    
    @abstractmethod
    async def generate_response(self, request: SupervisorRequest) -> Dict[str, Any]:
        """Generate AI response"""
        pass


class UnifiedAIService(BaseAIService):
    """Unified AI service handling all AI operations"""
    
    def __init__(self):
        self.supervisor = Supervisor()
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )
    
    def create_llm(self, config: UserConfig):
        """Create LLM instance based on configuration"""
        try:
            if config.aiProvider == "azure_openai" and config.azureOpenAIConfig:
                return AzureChatOpenAI(
                    azure_endpoint=config.azureOpenAIConfig.endpoint,
                    api_key=config.azureOpenAIConfig.apiKey,
                    api_version=config.azureOpenAIConfig.apiVersion,
                    azure_deployment=config.azureOpenAIConfig.deploymentName,
                    temperature=0.1,
                    streaming=True
                )
            elif config.aiProvider == "openai" and config.openaiApiKey:
                model_name = config.openaiModel.value if config.openaiModel else "gpt-4o"
                return ChatOpenAI(
                    api_key=config.openaiApiKey,
                    model=model_name,
                    temperature=0.1,
                    streaming=True
                )
            elif config.aiProvider == "anthropic" and config.anthropicApiKey:
                model_name = config.anthropicModel.value if config.anthropicModel else "claude-3.7-sonnet"
                return ChatAnthropic(
                    api_key=config.anthropicApiKey,
                    model=model_name,
                    temperature=0.1
                )
            else:
                raise ValueError("Invalid AI provider configuration")
        except Exception as e:
            logger.error(f"Failed to create LLM: {str(e)}")
            raise
    
    async def generate_response(self, request: SupervisorRequest) -> Dict[str, Any]:
        """Generate AI response using supervisor"""
        try:
            logger.info(f"Processing request with prompt: {request.prompt[:100]}...")
            
            # Use the supervisor for intelligent routing
            result = await self.supervisor.process_request(request)
            
            logger.info(f"Generated response type: {result.get('request_type')}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error generating AI response: {str(e)}")
            return {
                "request_type": "error",
                "response": f"죄송합니다. 요청 처리 중 오류가 발생했습니다: {str(e)}",
                "generated_code": "",
                "filename": "index.html",
                "language": "html",
                "session_id": getattr(request, 'session_id', 'default')
            }
    
    async def generate_streaming_response(
        self, 
        request: SupervisorRequest
    ) -> AsyncGenerator[str, None]:
        """Generate streaming AI response"""
        try:
            # For streaming, we'll use direct LLM calls
            llm = self.create_llm(request.config)
            
            # Get session history for context
            session_id = getattr(request, 'session_id', 'default')
            session_history = memory_service.get_session_history(session_id)
            
            # Build context-aware message history
            messages = []
            if session_history.messages:
                messages.extend(session_history.messages[-10:])  # Last 10 messages
            
            # Add current message
            current_message = HumanMessage(content=request.prompt)
            messages.append(current_message)
            
            # Stream response
            response = ""
            async for chunk in llm.astream(messages):
                if hasattr(chunk, 'content'):
                    response += chunk.content
                    yield chunk.content
            
            # Save to memory
            session_history.add_message(current_message)
            session_history.add_message(AIMessage(content=response))
            
        except Exception as e:
            logger.error(f"Error in streaming response: {str(e)}")
            yield f"오류가 발생했습니다: {str(e)}"
    
    async def generate_code_with_context(
        self,
        request: SupervisorRequest,
        current_code: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate code with current editor context"""
        try:
            # Add current code context to request
            if current_code:
                request.currentCode = current_code
            
            result = await self.generate_response(request)
            
            return result
            
        except Exception as e:
            logger.error(f"Error generating code with context: {str(e)}")
            return {
                "request_type": "error",
                "response": f"코드 생성 중 오류가 발생했습니다: {str(e)}",
                "generated_code": "",
                "filename": "index.html",
                "language": "html"
            }
    
    async def analyze_code_quality(
        self,
        code: str,
        language: str,
        config: UserConfig
    ) -> Dict[str, Any]:
        """Analyze code quality and provide suggestions"""
        try:
            llm = self.create_llm(config)
            
            analysis_prompt = f"""
            코드 품질 분석을 수행해주세요.
            
            언어: {language}
            코드:
            ```{language}
            {code}
            ```
            
            다음 관점에서 분석해주세요:
            1. 코드 구조와 가독성
            2. 성능 최적화 가능성
            3. 보안 이슈
            4. 모범 사례 준수도
            5. 개선 제안사항
            
            JSON 형태로 응답해주세요:
            {{
                "quality_score": "1-10 점수",
                "issues": ["발견된 문제들"],
                "suggestions": ["개선 제안사항"],
                "best_practices": ["적용할 수 있는 모범 사례"]
            }}
            """
            
            response = await llm.ainvoke([HumanMessage(content=analysis_prompt)])
            
            return {
                "analysis": response.content,
                "language": language,
                "analyzed_at": "now"
            }
            
        except Exception as e:
            logger.error(f"Error analyzing code quality: {str(e)}")
            return {
                "analysis": f"코드 분석 중 오류가 발생했습니다: {str(e)}",
                "language": language
            }
    
    def detect_technologies(self, code: str, filename: str) -> List[str]:
        """Detect technologies used in code"""
        technologies = set()
        
        # File extension based detection
        if filename.endswith('.tsx') or filename.endswith('.jsx'):
            technologies.add('react')
            technologies.add('typescript' if filename.endswith('.tsx') else 'javascript')
        elif filename.endswith('.vue'):
            technologies.add('vue')
        elif filename.endswith('.html'):
            technologies.add('html5')
        elif filename.endswith('.css') or filename.endswith('.scss'):
            technologies.add('css')
            if '.scss' in filename:
                technologies.add('sass')
        
        # Content based detection
        code_lower = code.lower()
        
        # Framework detection
        if 'from react' in code_lower or 'import react' in code_lower:
            technologies.add('react')
        if 'from next' in code_lower or 'import next' in code_lower:
            technologies.add('nextjs')
        if 'vue' in code_lower and ('script setup' in code_lower or 'vue' in filename):
            technologies.add('vue')
        
        # CSS framework detection
        if any(cls in code_lower for cls in ['tailwind', 'tw-', 'bg-', 'text-', 'p-', 'm-']):
            technologies.add('tailwindcss')
        if 'bootstrap' in code_lower or 'btn' in code_lower:
            technologies.add('bootstrap')
        
        # JavaScript/TypeScript
        if 'typescript' in code_lower or ': string' in code or 'interface ' in code:
            technologies.add('typescript')
        elif 'javascript' in code_lower or filename.endswith('.js'):
            technologies.add('javascript')
        
        return list(technologies)


# Global unified AI service instance
ai_service = UnifiedAIService()
