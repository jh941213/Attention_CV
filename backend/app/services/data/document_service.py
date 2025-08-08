"""
Document processing service for RAG functionality
Handles PDF, DOCX, Excel file uploads and content extraction
"""

import os
import tempfile
from typing import List, Dict, Any, Optional
from io import BytesIO
import logging

from langchain_community.document_loaders import (
    PyPDFLoader,
    Docx2txtLoader, 
    UnstructuredExcelLoader
)
from langchain_core.documents import Document
from fastapi import UploadFile

logger = logging.getLogger(__name__)


class DocumentService:
    """Service for processing uploaded documents and extracting content for RAG"""
    
    def __init__(self):
        self.supported_formats = {
            'pdf': ['.pdf'],
            'docx': ['.docx', '.doc'],
            'excel': ['.xlsx', '.xls'],
        }
    
    def get_supported_formats(self) -> List[str]:
        """Get list of all supported file extensions"""
        formats = []
        for format_list in self.supported_formats.values():
            formats.extend(format_list)
        return formats
    
    def is_supported_format(self, filename: str) -> bool:
        """Check if file format is supported"""
        ext = os.path.splitext(filename.lower())[1]
        return ext in self.get_supported_formats()
    
    async def process_uploaded_file(self, file: UploadFile) -> List[Document]:
        """Process an uploaded file and extract text content"""
        
        if not self.is_supported_format(file.filename):
            raise ValueError(f"Unsupported file format: {file.filename}")
        
        # Read file content
        file_content = await file.read()
        file_extension = os.path.splitext(file.filename.lower())[1]
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(
            suffix=file_extension, 
            delete=False
        ) as temp_file:
            temp_file.write(file_content)
            temp_file_path = temp_file.name
        
        try:
            # Process based on file type
            documents = await self._load_document(temp_file_path, file_extension, file.filename)
            return documents
            
        except Exception as e:
            logger.error(f"Error processing file {file.filename}: {str(e)}")
            raise ValueError(f"Failed to process file: {str(e)}")
            
        finally:
            # Clean up temporary file
            try:
                os.unlink(temp_file_path)
            except OSError:
                pass
    
    async def _load_document(self, file_path: str, extension: str, original_filename: str) -> List[Document]:
        """Load document based on file extension"""
        
        try:
            if extension == '.pdf':
                loader = PyPDFLoader(file_path)
                documents = loader.load()
                
            elif extension in ['.docx', '.doc']:
                loader = Docx2txtLoader(file_path)
                documents = loader.load()
                
            elif extension in ['.xlsx', '.xls']:
                loader = UnstructuredExcelLoader(file_path, mode="elements")
                documents = loader.load()
                
            else:
                raise ValueError(f"Unsupported file extension: {extension}")
            
            # Add metadata to documents
            from datetime import datetime
            for doc in documents:
                doc.metadata.update({
                    'source_file': original_filename,
                    'file_type': extension,
                    'processed_at': str(datetime.now())
                })
            
            logger.info(f"Successfully processed {original_filename}: {len(documents)} documents extracted")
            return documents
            
        except Exception as e:
            logger.error(f"Error loading document {original_filename}: {str(e)}")
            raise
    
    def create_rag_context(self, documents: List[Document], max_length: int = 4000) -> str:
        """Create RAG context from documents, truncating if necessary"""
        
        if not documents:
            return ""
        
        context_parts = []
        current_length = 0
        
        for i, doc in enumerate(documents):
            # Add document header
            source_file = doc.metadata.get('source_file', f'Document {i+1}')
            header = f"\n[Document: {source_file}]\n"
            
            # Check if we can add this document
            doc_content = doc.page_content.strip()
            total_content = header + doc_content
            
            if current_length + len(total_content) > max_length:
                # If this is the first document, truncate it
                if not context_parts:
                    remaining_space = max_length - len(header) - 50  # Leave space for truncation message
                    if remaining_space > 100:
                        truncated_content = doc_content[:remaining_space] + "...[내용 생략]"
                        context_parts.append(header + truncated_content)
                break
            
            context_parts.append(total_content)
            current_length += len(total_content)
        
        return "\n".join(context_parts)
    
    def extract_key_information(self, documents: List[Document]) -> Dict[str, Any]:
        """Extract key information summary from documents"""
        
        info = {
            'total_documents': len(documents),
            'file_types': set(),
            'source_files': set(),
            'total_text_length': 0,
            'summary': []
        }
        
        for doc in documents:
            info['file_types'].add(doc.metadata.get('file_type', 'unknown'))
            info['source_files'].add(doc.metadata.get('source_file', 'unknown'))
            info['total_text_length'] += len(doc.page_content)
            
            # Add first 150 characters as preview
            preview = doc.page_content.strip()[:150]
            if len(doc.page_content) > 150:
                preview += "..."
            info['summary'].append({
                'source': doc.metadata.get('source_file', 'unknown'),
                'preview': preview
            })
        
        # Convert sets to lists for JSON serialization
        info['file_types'] = list(info['file_types'])
        info['source_files'] = list(info['source_files'])
        
        return info


# Global service instance
document_service = DocumentService()