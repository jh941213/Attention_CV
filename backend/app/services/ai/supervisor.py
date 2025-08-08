"""AI Supervisor for routing chat vs code requests."""

from typing import Literal, Dict, Any, List
from pydantic import BaseModel, Field
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from langchain_openai import AzureChatOpenAI, ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langgraph.graph import StateGraph, MessagesState, START, END
from langgraph.types import Command
from langgraph.prebuilt import create_react_agent

from ...models.schemas import UserConfig
from ..data.memory_service import memory_service
from ..data.document_service import document_service


class RequestType(BaseModel):
    """Request type classification."""
    type: Literal["chat", "code"] = Field(
        description="Type of request: 'chat' for general questions, 'code' for code generation/modification"
    )
    confidence: float = Field(
        description="Confidence score between 0 and 1"
    )
    reasoning: str = Field(
        description="Brief explanation of the classification"
    )


class SupervisorState(MessagesState):
    """Extended state for the supervisor."""
    request_type: str = "unknown"
    confidence: float = 0.0
    reasoning: str = ""
    response: str = ""
    generated_code: str = ""
    filename: str = "index.html"
    language: str = "html"
    session_id: str = "default"


class Supervisor:
    """Multi-agent supervisor for intelligent routing."""

    def __init__(self):
        self.graph = None
        
    def _create_llm(self, config: UserConfig):
        """Create LLM instance based on configuration."""
        if config.aiProvider == "azure_openai" and config.azureOpenAIConfig:
            return AzureChatOpenAI(
                azure_endpoint=config.azureOpenAIConfig.endpoint,
                api_key=config.azureOpenAIConfig.apiKey,
                api_version=config.azureOpenAIConfig.apiVersion,
                azure_deployment=config.azureOpenAIConfig.deploymentName,
                temperature=0.1
            )
        elif config.aiProvider == "openai" and config.openaiApiKey:
            model_name = config.openaiModel.value if config.openaiModel else "gpt-4o"
            return ChatOpenAI(
                api_key=config.openaiApiKey,
                model=model_name,
                temperature=0.1
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

    def _create_supervisor_node(self, llm):
        """Create the supervisor node for request routing."""
        
        # Create a structured output LLM for classification
        classifier = llm.with_structured_output(RequestType)
        
        def supervisor_node(state: SupervisorState) -> Command[Literal["chat_agent", "code_agent", END]]:
            """Supervisor node that routes requests to appropriate agents."""
            
            # Get the latest message
            if not state.get("messages"):
                return Command(goto=END, update={"response": "No message to process"})
                
            last_message = state["messages"][-1]
            if isinstance(last_message, dict):
                content = last_message.get("content", "")
            else:
                content = last_message.content
            
            # Get conversation history and RAG documents for context
            session_id = state.get("session_id", "default")
            session_history = memory_service.get_session_history(session_id)
            session_documents = memory_service.get_session_documents(session_id)
            
            # Build full conversation context with RAG
            conversation_messages = []
            if session_history.messages:
                conversation_messages.extend(session_history.messages)
            
            # Add RAG context if available
            rag_context = ""
            if session_documents:
                document_context = document_service.create_rag_context(session_documents, max_length=1500)
                rag_context = f"""

**업로드된 사용자 정보 (중요!):**
{document_context}

**RAG 지침:**
- 위 업로드된 문서에는 사용자의 개인 정보, 경력, 기술 등이 포함되어 있습니다
- 코드 생성 시 반드시 이 정보를 참조하여 개인화된 내용을 만들어주세요
- 사용자의 실제 이름, 경력, 기술 스택 등을 코드에 반영해주세요
"""
            
            # Build context-aware classification prompt
            context = ""
            if conversation_messages:
                # Get last 30 messages for full context - 더 많은 기억
                recent_messages = conversation_messages[-30:] if len(conversation_messages) > 30 else conversation_messages
                context = "\n\nConversation History:\n"
                for msg in recent_messages:
                    role = "Human" if isinstance(msg, HumanMessage) else "AI"
                    context += f"{role}: {msg.content}\n"  # 내용 전체 다 포함
            
            # Classify the request with context
            classification_prompt = f"""
            Analyze the following user request and classify it as either a 'chat' request or a 'code' request.
            Consider the conversation history for context.
            
            Classification criteria:
            - 'code': Requests for code generation, code modification, programming help, web development, 
              HTML/CSS/JS creation, fixing bugs, creating components, building websites, technical implementation
            - 'chat': General questions, explanations, discussions, non-coding inquiries, conceptual questions
            {context}
            
            Current user request: {content}
            """
            
            try:
                result = classifier.invoke([HumanMessage(content=classification_prompt)])
                
                # Route based on classification
                if result.type == "code":
                    return Command(
                        goto="code_agent",
                        update={
                            "request_type": result.type,
                            "confidence": result.confidence,
                            "reasoning": result.reasoning,
                            "conversation_messages": conversation_messages,
                            "rag_context": rag_context,
                            "session_documents": session_documents
                        }
                    )
                else:
                    return Command(
                        goto="chat_agent", 
                        update={
                            "request_type": result.type,
                            "confidence": result.confidence,
                            "reasoning": result.reasoning,
                            "conversation_messages": conversation_messages,
                            "rag_context": rag_context,
                            "session_documents": session_documents
                        }
                    )
                    
            except Exception as e:
                print(f"Classification error: {e}")
                # Default to chat for safety
                return Command(
                    goto="chat_agent",
                    update={
                        "request_type": "chat",
                        "confidence": 0.5,
                        "reasoning": f"Classification failed: {str(e)}"
                    }
                )
        
        return supervisor_node

    def _create_chat_agent(self, llm):
        """Create the chat agent for general conversations."""
        
        def chat_agent(state: SupervisorState) -> Command[Literal[END]]:
            """Chat agent that handles general questions and conversations."""
            
            if not state.get("messages"):
                return Command(goto=END, update={"response": "No message to process"})
            
            last_message = state["messages"][-1]
            if isinstance(last_message, dict):
                content = last_message.get("content", "")
            else:
                content = last_message.content
            
            # Get conversation history for context-aware responses
            session_id = state.get("session_id", "default")
            session_history = memory_service.get_session_history(session_id)
            
            # Get uploaded documents for RAG
            session_documents = memory_service.get_session_documents(session_id)
            
            # Get current code context from request
            current_code = state.get("currentCode")
            current_filename = state.get("currentFilename") 
            current_language = state.get("currentLanguage")
            
            # Build conversation context - 최근 30개 메시지 전체 내용 포함
            conversation_messages = []
            if session_history.messages:
                # Include last 30 messages with full content
                recent_messages = session_history.messages[-30:] if len(session_history.messages) > 30 else session_history.messages
                conversation_messages.extend(recent_messages)
            
            # Add the current user message
            current_user_message = HumanMessage(content=content)
            conversation_messages.append(current_user_message)
            
            # Create RAG-enhanced system prompt
            document_context = ""
            if session_documents:
                rag_context = document_service.create_rag_context(session_documents, max_length=2000)
                document_context = f"""

**업로드된 문서 내용:**
{rag_context}

**문서 정보:**
- 총 {len(session_documents)}개의 문서가 업로드되었습니다.
- 사용자가 업로드한 문서의 내용을 참조하여 질문에 답변해주세요.
- 문서에서 직접적인 정보를 찾을 수 없는 경우, 일반적인 지식으로 답변하되 문서 내용과 구분해서 설명해주세요.
"""
            
            system_prompt = f"""
            You are a helpful AI assistant for a GitHub Pages generator application called "Attention CV". 
            This application helps users create CV/resume websites and deploy them to GitHub Pages.
            
            You have access to the full conversation history, so you can:
            - Remember what users have told you about themselves
            - Reference previous parts of the conversation
            - Provide personalized responses based on context
            {document_context}
            
            Please provide helpful, informative, and friendly responses to user questions.
            Keep your responses conversational and engaging.
            If users ask about their previous statements or information, refer to the conversation history.
            When referencing uploaded documents, clearly indicate that the information comes from the uploaded files.
            """
            
            # Add system message at the beginning
            messages_with_system = [HumanMessage(content=system_prompt)] + conversation_messages
            
            try:
                response = llm.invoke(messages_with_system)
                
                # Save both user message and AI response to memory
                session_history.add_message(current_user_message)
                session_history.add_message(AIMessage(content=response.content))
                
                return Command(
                    goto=END,
                    update={
                        "response": response.content,
                        "messages": state["messages"] + [AIMessage(content=response.content)]
                    }
                )
            except Exception as e:
                error_message = f"죄송합니다. 오류가 발생했습니다: {str(e)}"
                # Save error to memory as well
                session_history.add_message(current_user_message)
                session_history.add_message(AIMessage(content=error_message))
                
                return Command(
                    goto=END,
                    update={
                        "response": error_message,
                        "messages": state["messages"] + [AIMessage(content=error_message)]
                    }
                )
        
        return chat_agent

    def _create_code_agent(self, llm):
        """Create the code agent for code generation and modification."""
        
        def code_agent(state: SupervisorState) -> Command[Literal[END]]:
            """Code agent that handles code generation and modification requests."""
            
            if not state.get("messages"):
                return Command(goto=END, update={"response": "No message to process"})
            
            last_message = state["messages"][-1]
            if isinstance(last_message, dict):
                content = last_message.get("content", "")
            else:
                content = last_message.content
            
            # Get conversation history for context-aware code generation
            session_id = state.get("session_id", "default")
            session_history = memory_service.get_session_history(session_id)
            
            # Get current code context from request
            current_code = state.get("currentCode")
            current_filename = state.get("currentFilename") 
            current_language = state.get("currentLanguage")
            
            # Build conversation context including previous code requests  
            conversation_context = ""
            if session_history.messages:
                # Get last 30 messages for full context - 더 많은 기억
                relevant_messages = session_history.messages[-30:] if len(session_history.messages) > 30 else session_history.messages
                
                if relevant_messages:
                    conversation_context = "\n\nPrevious Conversation Context:\n"
                    for msg in relevant_messages:
                        role = "User" if isinstance(msg, HumanMessage) else "Assistant"
                        conversation_context += f"{role}: {msg.content}\n"  # 내용 전체 다 포함
            
            # Build current code context
            current_code_context = ""
            if current_code and current_code.strip():
                current_code_context = f"""

**CURRENT CODE IN EDITOR:**
Filename: {current_filename or 'index.html'}
Language: {current_language or 'html'}

```{current_language or 'html'}
{current_code[:1000]}{'...(truncated)' if len(current_code) > 1000 else ''}
```

**IMPORTANT INSTRUCTIONS:**
- The user has existing code in their editor (shown above)
- If they're asking for modifications, UPDATE/ENHANCE the existing code rather than creating new code
- If they're asking for something completely different, you can create new code but ask for confirmation
- Preserve their work and build upon it when possible
"""
            
            # Determine if we should use incremental updates
            enable_incremental = state.get("enable_incremental_updates", True)
            has_existing_code = current_code and current_code.strip()
            
            if enable_incremental and has_existing_code:
                # Create incremental update prompt
                code_prompt = f"""
                You are an expert web developer with advanced code modification capabilities.
                The user has existing code and wants modifications. Instead of replacing everything, make targeted changes.
                
                CURRENT CODE:
                ```{current_language or 'html'}
                {current_code}
                ```
                
                MODIFICATION REQUEST: {content}
                {conversation_context}
                
                Provide INCREMENTAL UPDATES using this format:
                
                EXPLANATION: [Brief explanation of changes]
                INCREMENTAL_OPERATIONS:
                [
                  {
                    "operation": "replace|insert|delete|append|prepend",
                    "target": "line_number|function_name|css_selector",
                    "old_content": "content to replace (if replace operation)",
                    "new_content": "new content to insert",
                    "line_start": number,
                    "line_end": number
                  }
                ]
                
                IMPORTANT: 
                - Use "replace" for changing existing content
                - Use "insert" for adding new content at specific location
                - Use "append" for adding to end of file/section
                - Use "prepend" for adding to beginning of file/section
                - Use "delete" for removing content
                - Provide line numbers when possible
                - Make minimal, targeted changes
                """
            else:
                # Create full code generation prompt with RAG context
                code_prompt = f"""
                You are an expert web developer specializing in creating modern, responsive, and accessible CV/resume websites.
                The user has requested code generation or modification for their GitHub Pages CV website.
                
                IMPORTANT - UPLOADED USER INFORMATION:
                {rag_context}
                
                CONVERSATION HISTORY:
                {conversation_context}
                
                CURRENT CODE CONTEXT:
                {current_code_context}
                
                Current user request: {content}
                
                CRITICAL INSTRUCTIONS:
                1. **MUST USE UPLOADED USER DATA**: If user documents are uploaded, use their REAL information (name, experience, skills, education, etc.)
                2. **PERSONALIZATION**: Create a highly personalized CV based on their actual background
                3. **NO PLACEHOLDER DATA**: Replace ALL placeholder content with their real information
                4. **MAINTAIN CONTEXT**: Build upon previous conversation and code decisions
                5. **PROFESSIONAL DESIGN**: Create modern, clean, responsive design suitable for their industry/role
                
                Generate production-ready code that reflects their actual professional profile.
                Include proper HTML structure, modern CSS, and JavaScript if needed.
                
                Format your response as:
                EXPLANATION: [Brief explanation of what was created and what user data was incorporated]
                CODE: [The complete code with user's real information]
                FILENAME: [Suggested filename]
                LANGUAGE: [Programming language/type]
                """
            
            try:
                current_user_message = HumanMessage(content=content)
                response = llm.invoke([HumanMessage(content=code_prompt)])
                response_text = response.content
                
                # Parse the response to extract different parts
                code = ""
                explanation = ""
                filename = current_filename or "index.html"
                language = current_language or "html"
                incremental_update = None
                
                # Check if this is an incremental update response
                if "INCREMENTAL_OPERATIONS:" in response_text and has_existing_code:
                    import json
                    import re
                    
                    try:
                        # Parse incremental update
                        if "EXPLANATION:" in response_text:
                            explanation_part = response_text.split("EXPLANATION:")[1]
                            if "INCREMENTAL_OPERATIONS:" in explanation_part:
                                explanation = explanation_part.split("INCREMENTAL_OPERATIONS:")[0].strip()
                        
                        # Extract JSON operations
                        operations_match = re.search(r'INCREMENTAL_OPERATIONS:\s*(\[.*?\])', response_text, re.DOTALL)
                        if operations_match:
                            operations_json = operations_match.group(1)
                            operations_data = json.loads(operations_json)
                            
                            # Convert to CodeOperation objects
                            from ..models.schemas import CodeOperation, IncrementalCodeUpdate
                            operations = [
                                CodeOperation(
                                    operation=op.get("operation", "replace"),
                                    target=op.get("target", ""),
                                    old_content=op.get("old_content"),
                                    new_content=op.get("new_content", ""),
                                    line_start=op.get("line_start"),
                                    line_end=op.get("line_end")
                                )
                                for op in operations_data
                            ]
                            
                            incremental_update = IncrementalCodeUpdate(
                                update_type="incremental",
                                operations=operations,
                                explanation=explanation,
                                estimated_impact="medium"
                            )
                            
                    except (json.JSONDecodeError, KeyError, ValueError) as e:
                        print(f"Failed to parse incremental operations: {e}")
                        # Fall back to full code generation
                        incremental_update = None
                
                # Standard parsing for full code generation
                if not incremental_update:
                    if "CODE:" in response_text:
                        parts = response_text.split("CODE:")
                        if len(parts) > 1:
                            code = parts[1].strip()
                            if "FILENAME:" in code:
                                code_parts = code.split("FILENAME:")
                                code = code_parts[0].strip()
                                if len(code_parts) > 1:
                                    filename_part = code_parts[1].strip()
                                    if "LANGUAGE:" in filename_part:
                                        filename_lang_parts = filename_part.split("LANGUAGE:")
                                        filename = filename_lang_parts[0].strip()
                                        if len(filename_lang_parts) > 1:
                                            language = filename_lang_parts[1].strip().lower()
                                    else:
                                        filename = filename_part
                    
                    if "EXPLANATION:" in response_text:
                        explanation_part = response_text.split("EXPLANATION:")[1]
                        if "CODE:" in explanation_part:
                            explanation = explanation_part.split("CODE:")[0].strip()
                        else:
                            explanation = explanation_part.strip()
                    
                    # If parsing failed, use the whole response as code
                    if not code and not incremental_update:
                        code = response_text
                        explanation = "Generated code based on your request"
                
                # Save conversation to memory
                session_history.add_message(current_user_message)
                ai_response = f"{explanation}\n\n생성된 코드: {filename} ({language})"
                session_history.add_message(AIMessage(content=ai_response))
                
                return Command(
                    goto=END,
                    update={
                        "response": explanation,
                        "generated_code": code,
                        "filename": filename,
                        "language": language,
                        "incremental_update": incremental_update,
                        "messages": state["messages"] + [AIMessage(content=f"{explanation}\n\n{'코드 업데이트' if incremental_update else '생성된 코드'}가 오른쪽 에디터에 표시됩니다.")]
                    }
                )
            except Exception as e:
                error_message = f"코드 생성 중 오류가 발생했습니다: {str(e)}"
                # Save error to memory
                session_history.add_message(HumanMessage(content=content))
                session_history.add_message(AIMessage(content=error_message))
                
                return Command(
                    goto=END,
                    update={
                        "response": error_message,
                        "messages": state["messages"] + [AIMessage(content=error_message)]
                    }
                )
        
        return code_agent

    def create_supervisor_graph(self, config: UserConfig) -> StateGraph:
        """Create and compile the supervisor graph."""
        
        # Create LLM
        llm = self._create_llm(config)
        
        # Create agents
        supervisor_node = self._create_supervisor_node(llm)
        chat_agent = self._create_chat_agent(llm)
        code_agent = self._create_code_agent(llm)
        
        # Build the graph
        builder = StateGraph(SupervisorState)
        
        # Add nodes
        builder.add_node("supervisor", supervisor_node)
        builder.add_node("chat_agent", chat_agent)
        builder.add_node("code_agent", code_agent)
        
        # Add edges
        builder.add_edge(START, "supervisor")
        
        # Compile and return
        self.graph = builder.compile()
        return self.graph

    async def process_request(self, request) -> Dict[str, Any]:
        """Process a chat request through the supervisor graph with multi-turn memory."""
        
        if not self.graph:
            self.graph = self.create_supervisor_graph(request.config)
        
        # Get or create session ID for memory management
        session_id = getattr(request, 'session_id', None) or getattr(request.config, 'sessionId', None) or 'default'
        
        # Create initial state with session ID and current code context
        initial_state = {
            "messages": [HumanMessage(content=request.prompt)],
            "request_type": "unknown",
            "confidence": 0.0,
            "reasoning": "",
            "response": "",
            "generated_code": "",
            "filename": "index.html",
            "language": "html",
            "session_id": session_id,
            "currentCode": getattr(request, 'currentCode', None),
            "currentFilename": getattr(request, 'currentFilename', None),
            "currentLanguage": getattr(request, 'currentLanguage', None)
        }
        
        try:
            # Run the graph
            result = self.graph.invoke(initial_state)
            
            # Return structured response
            return {
                "request_type": result.get("request_type", "unknown"),
                "confidence": result.get("confidence", 0.0),
                "reasoning": result.get("reasoning", ""),
                "response": result.get("response", ""),
                "generated_code": result.get("generated_code", ""),
                "filename": result.get("filename", "index.html"),
                "language": result.get("language", "html"),
                "incremental_update": result.get("incremental_update"),
                "messages": result.get("messages", []),
                "session_id": session_id
            }
            
        except Exception as e:
            # Save error to memory for context
            session_history = memory_service.get_session_history(session_id)
            error_user_msg = HumanMessage(content=request.prompt)
            error_ai_msg = AIMessage(content=f"오류 발생: {str(e)}")
            session_history.add_message(error_user_msg)
            session_history.add_message(error_ai_msg)
            
            return {
                "request_type": "error",
                "confidence": 0.0,
                "reasoning": f"Processing error: {str(e)}",
                "response": f"죄송합니다. 요청 처리 중 오류가 발생했습니다: {str(e)}",
                "generated_code": "",
                "filename": "index.html", 
                "language": "html",
                "messages": [HumanMessage(content=request.prompt)],
                "session_id": session_id
            }