from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import List
import logging

from app.models.schemas import (
    GenerateRequest,
    FeedbackRequest,
    CodeGenerationResponse, 
    ErrorResponse,
    ChatMessage,
    UserConfig,
    CodeOnlyRequest,
    CodeOnlyResponse,
    SupervisorRequest,
    SupervisorResponse
)
from app.services import ai_service, Supervisor, CodeAnalyzer, memory_service, document_service

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/generate", response_model=CodeGenerationResponse)
async def generate_code(request: GenerateRequest):
    """
    Generate code using AI service with memory integration
    """
    try:
        # Generate response using unified AI service
        from app.models.schemas import SupervisorRequest
        chat_request = SupervisorRequest(
            prompt=request.prompt,
            config=request.config,
            files=getattr(request, 'files', [])
        )
        response = await ai_service.generate_response(chat_request)
        
        return response
        
    except Exception as e:
        logger.error(f"Error generating code: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze", response_model=dict)
async def analyze_code(request: dict):
    """
    Analyze existing code structure for better context
    """
    try:
        # Code analysis through unified AI service
        from app.models.schemas import SupervisorRequest, UserConfig
        user_config = UserConfig(**request.get("config", {}))
        prompt = f"Analyze this repository: {request.get('repository_url')}"
        chat_request = SupervisorRequest(prompt=prompt, config=user_config)
        result = await ai_service.generate_response(chat_request)
        
        return result
        
    except Exception as e:
        logger.error(f"Error analyzing code: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/feedback", response_model=CodeGenerationResponse)
async def apply_feedback(request: dict):
    """
    Apply feedback to previously generated code
    """
    try:
        user_config = UserConfig(**request.get("user_config"))
        feedback = request.get("feedback", "")
        target_files = request.get("target_files", [])
        
        # Apply feedback using unified AI service
        from app.models.schemas import SupervisorRequest
        chat_request = SupervisorRequest(
            prompt=f"Apply this feedback to the code: {feedback}",
            config=user_config,
            files=target_files
        )
        response = await ai_service.generate_response(chat_request)
        
        return response
        
    except Exception as e:
        logger.error(f"Error applying feedback: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/continue", response_model=CodeGenerationResponse)
async def continue_conversation(request: dict):
    """
    Continue an existing conversation with additional context
    """
    try:
        user_config = UserConfig(**request.get("user_config"))
        message = request.get("message", "")
        context = request.get("context")
        
        # Continue conversation using unified AI service
        from app.models.schemas import SupervisorRequest
        chat_request = SupervisorRequest(
            prompt=message,
            config=user_config,
            context=context
        )
        response = await ai_service.generate_response(chat_request)
        
        return response
        
    except Exception as e:
        logger.error(f"Error continuing conversation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversation/{session_id}")
async def get_conversation_summary(session_id: str):
    """
    Get conversation summary for a session
    """
    try:
        summary = memory_service.get_session_summary(session_id)
        return summary
        
    except Exception as e:
        logger.error(f"Error getting conversation summary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/conversation/{session_id}")
async def clear_conversation(session_id: str):
    """
    Clear conversation history for a session
    """
    try:
        success = memory_service.clear_session_history(session_id)
        return {"session_id": session_id, "cleared": success}
        
    except Exception as e:
        logger.error(f"Error clearing conversation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions")
async def list_active_sessions():
    """
    List all active conversation sessions
    """
    try:
        sessions = memory_service.list_active_sessions()
        return {"sessions": sessions}
        
    except Exception as e:
        logger.error(f"Error listing sessions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-code", response_model=CodeOnlyResponse)
async def generate_code_only(request: CodeOnlyRequest):
    """
    Generate only code content without chat context - for code editor
    """
    try:
        # Generate code using unified AI service
        from app.models.schemas import SupervisorRequest
        chat_request = SupervisorRequest(
            prompt=request.prompt,
            config=request.config,
            currentCode=getattr(request, 'currentCode', None),
            currentFilename=getattr(request, 'currentFilename', None),
            currentLanguage=getattr(request, 'currentLanguage', None)
        )
        response = await ai_service.generate_code_with_context(chat_request)
        
        # Convert SupervisorResponse to CodeOnlyResponse format
        return CodeOnlyResponse(
            code=response.get('generated_code', ''),
            language=response.get('language', 'html'),
            filename=response.get('filename', 'index.html'),
            explanation=response.get('response', '')
        )
        
    except Exception as e:
        logger.error(f"Error generating code only: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/supervisor", response_model=SupervisorResponse)
async def supervisor_routing(request: SupervisorRequest):
    """
    LangGraph multi-agent supervisor for intelligent request routing
    Routes general questions to chat and code requests to code generation
    """
    try:
        # Debug logging for session tracking
        session_id = getattr(request, 'session_id', None) or getattr(request.config, 'sessionId', None) or 'default'
        print(f"🔍 Chat request - Session ID: {session_id}, Request: {request.prompt[:50]}...")
        logger.info(f"🔍 Chat request - Session ID: {session_id}, Request: {request.prompt[:50]}...")
        
        # Check document count for this session
        doc_count = memory_service.get_session_document_count(session_id)
        print(f"📄 Session {session_id} has {doc_count} documents")
        logger.info(f"📄 Session {session_id} has {doc_count} documents")
        # Initialize LangGraph supervisor
        supervisor = Supervisor()
        
        # Process request through supervisor graph
        result = await supervisor.process_request(request)
        
        return SupervisorResponse(
            request_type=result["request_type"],
            confidence=result["confidence"],
            reasoning=result["reasoning"],
            response=result["response"],
            generated_code=result["generated_code"],
            filename=result["filename"],
            language=result["language"],
            success=True
        )
        
    except Exception as e:
        logger.error(f"Error in supervisor routing: {str(e)}")
        return SupervisorResponse(
            request_type="error",
            confidence=0.0,
            reasoning=f"Processing error: {str(e)}",
            response=f"죄송합니다. 요청 처리 중 오류가 발생했습니다: {str(e)}",
            generated_code="",
            filename="index.html",
            language="html",
            success=False
        )


@router.post("/upload-document")
async def upload_document(file: UploadFile = File(...), session_id: str = Form("default")):
    """
    Upload and process documents (PDF, DOCX, Excel) for RAG functionality
    """
    try:
        print(f"🔍 Document upload request - Session ID: {session_id}, File: {file.filename}")
        logger.info(f"🔍 Document upload request - Session ID: {session_id}, File: {file.filename}")
        # Validate file format
        if not document_service.is_supported_format(file.filename):
            supported = document_service.get_supported_formats()
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported file format. Supported formats: {', '.join(supported)}"
            )
        
        # Process the uploaded document
        documents = await document_service.process_uploaded_file(file)
        
        # Store documents in session memory
        success = memory_service.add_session_documents(session_id, documents)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to store documents in session")
        
        # Extract key information
        info = document_service.extract_key_information(documents)
        
        # Create a preview of the content
        preview_context = document_service.create_rag_context(documents, max_length=500)
        
        return {
            "success": True,
            "message": f"Successfully processed {file.filename}",
            "session_id": session_id,
            "file_info": info,
            "preview": preview_context,
            "document_count": len(documents),
            "total_session_documents": memory_service.get_session_document_count(session_id)
        }
        
    except ValueError as e:
        logger.error(f"Error processing uploaded document: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
        
    except Exception as e:
        logger.error(f"Unexpected error in document upload: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during document processing")


@router.get("/document/supported-formats")
async def get_supported_formats():
    """
    Get list of supported document formats for upload
    """
    try:
        formats = document_service.get_supported_formats()
        return {
            "supported_formats": formats,
            "format_info": {
                "pdf": "PDF documents (.pdf)",
                "docx": "Microsoft Word documents (.docx, .doc)",
                "excel": "Microsoft Excel files (.xlsx, .xls)"
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting supported formats: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")