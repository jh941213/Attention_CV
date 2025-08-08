from fastapi import APIRouter, HTTPException
from typing import List
import logging

from app.models.schemas import (
    GitOperationRequest,
    GitOperationResponse,
    ErrorResponse,
    FileOperation
)
from app.services import GitHubService

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/commit", response_model=GitOperationResponse)
async def commit_and_push(request: GitOperationRequest):
    """
    Commit files to GitHub repository and push changes
    """
    try:
        github_service = GitHubService(
            token=request.user_config.git_config.github_token,
            repo_url=request.user_config.git_config.repository_url
        )
        
        result = await github_service.commit_and_push(
            files=request.files,
            commit_message=request.commit_message,
            git_config=request.user_config.git_config
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error committing to GitHub: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/repository/info")
async def get_repository_info(repo_url: str, github_token: str):
    """
    Get repository information and GitHub Pages status
    """
    try:
        github_service = GitHubService(
            token=github_token,
            repo_url=repo_url
        )
        
        info = await github_service.get_repository_info()
        return info
        
    except Exception as e:
        logger.error(f"Error getting repository info: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pages/enable")
async def enable_github_pages(repo_url: str, github_token: str, source_branch: str = "main"):
    """
    Enable GitHub Pages for the repository
    """
    try:
        github_service = GitHubService(
            token=github_token,
            repo_url=repo_url
        )
        
        result = await github_service.enable_github_pages(source_branch)
        return result
        
    except Exception as e:
        logger.error(f"Error enabling GitHub Pages: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pages/status")
async def get_pages_status(repo_url: str, github_token: str):
    """
    Get GitHub Pages deployment status
    """
    try:
        github_service = GitHubService(
            token=github_token,
            repo_url=repo_url
        )
        
        status = await github_service.get_pages_status()
        return status
        
    except Exception as e:
        logger.error(f"Error getting Pages status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))