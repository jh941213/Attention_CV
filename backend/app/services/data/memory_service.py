from typing import Dict, List
from langchain_core.chat_history import InMemoryChatMessageHistory, BaseChatMessageHistory
from langchain_core.documents import Document
import logging

logger = logging.getLogger(__name__)


class MemoryService:
    """Service for managing conversation memory across sessions"""
    
    def __init__(self):
        # Store chat histories by session ID
        self.chat_histories: Dict[str, InMemoryChatMessageHistory] = {}
        # Store uploaded documents by session ID
        self.session_documents: Dict[str, List[Document]] = {}
    
    def get_session_history(self, session_id: str) -> BaseChatMessageHistory:
        """Get or create chat history for a session"""
        if session_id not in self.chat_histories:
            logger.info(f"Creating new chat history for session: {session_id}")
            self.chat_histories[session_id] = InMemoryChatMessageHistory()
        
        return self.chat_histories[session_id]
    
    def clear_session_history(self, session_id: str) -> bool:
        """Clear chat history for a specific session"""
        if session_id in self.chat_histories:
            self.chat_histories[session_id].clear()
            logger.info(f"Cleared chat history for session: {session_id}")
            return True
        return False
    
    def get_session_message_count(self, session_id: str) -> int:
        """Get number of messages in a session"""
        if session_id in self.chat_histories:
            return len(self.chat_histories[session_id].messages)
        return 0
    
    def list_active_sessions(self) -> list:
        """Get list of active session IDs"""
        return list(self.chat_histories.keys())
    
    def get_session_summary(self, session_id: str) -> dict:
        """Get summary information for a session"""
        if session_id not in self.chat_histories:
            return {"session_id": session_id, "message_count": 0, "exists": False, "document_count": 0}
        
        history = self.chat_histories[session_id]
        document_count = len(self.session_documents.get(session_id, []))
        
        return {
            "session_id": session_id,
            "message_count": len(history.messages),
            "exists": True,
            "document_count": document_count,
            "last_messages": [
                {
                    "type": msg.__class__.__name__,
                    "content": msg.content[:100] + "..." if len(msg.content) > 100 else msg.content
                }
                for msg in history.messages[-3:]  # Last 3 messages
            ]
        }
    
    def add_session_documents(self, session_id: str, documents: List[Document]) -> bool:
        """Add documents to a session"""
        try:
            if session_id not in self.session_documents:
                self.session_documents[session_id] = []
            
            self.session_documents[session_id].extend(documents)
            logger.info(f"Added {len(documents)} documents to session: {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error adding documents to session {session_id}: {str(e)}")
            return False
    
    def get_session_documents(self, session_id: str) -> List[Document]:
        """Get documents for a session"""
        return self.session_documents.get(session_id, [])
    
    def clear_session_documents(self, session_id: str) -> bool:
        """Clear documents for a session"""
        if session_id in self.session_documents:
            del self.session_documents[session_id]
            logger.info(f"Cleared documents for session: {session_id}")
            return True
        return False
    
    def get_session_document_count(self, session_id: str) -> int:
        """Get number of documents in a session"""
        return len(self.session_documents.get(session_id, []))


# Global memory service instance
memory_service = MemoryService()