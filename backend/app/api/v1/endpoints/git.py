from fastapi import APIRouter, HTTPException
from typing import List
import logging

from app.models.schemas import (
    GitOperationRequest,
    GitOperationResponse,
    UserConfig,
    FileOperation
)
from app.services.tools.git_service import git_service

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/commit", response_model=GitOperationResponse)
async def commit_files(request: GitOperationRequest):
    """
    Commit files directly to GitHub repository
    """
    try:
        # Validate GitHub access
        validation = await git_service.validate_repository_access(request.config.gitConfig)
        if not validation['valid']:
            raise HTTPException(
                status_code=401, 
                detail=f"GitHub access validation failed: {validation.get('error', 'Unknown error')}"
            )
        
        # Commit files to GitHub
        result = await git_service.commit_files(
            config=request.config.gitConfig,
            files=request.files,
            commit_message=request.commitMessage
        )
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result.get('error', 'Commit failed'))
        
        return GitOperationResponse(
            success=True,
            message="Files committed successfully",
            commitSha=result.get('commit_sha'),
            pagesUrl=result.get('pages_url'),
            repositoryUrl=request.config.gitConfig.repositoryUrl
        )
        
    except Exception as e:
        logger.error(f"Error committing files: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/repository/{owner}/{repo}")
async def get_repository_info(owner: str, repo: str, token: str):
    """
    Get repository information
    """
    try:
        from app.models.schemas import GitConfig
        repo_url = f"https://github.com/{owner}/{repo}"
        git_config = GitConfig(repositoryUrl=repo_url, token=token)
        
        repo_info = await git_service.validate_repository_access(git_config)
        return repo_info
        
    except Exception as e:
        logger.error(f"Error getting repository info: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pages-status")
async def get_pages_status(repo_url: str, token: str):
    """
    Get GitHub Pages deployment status
    """
    try:
        from app.models.schemas import GitConfig
        git_config = GitConfig(repositoryUrl=repo_url, token=token)
        
        validation = await git_service.validate_repository_access(git_config)
        if validation['valid']:
            return {
                'enabled': validation.get('pages_enabled', False),
                'url': validation.get('pages_url'),
                'status': 'active' if validation.get('pages_enabled') else 'disabled'
            }
        else:
            raise HTTPException(status_code=400, detail=validation.get('error'))
        
    except Exception as e:
        logger.error(f"Error getting pages status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/enable-pages")
async def enable_github_pages(repo_url: str, token: str, source_branch: str = "main"):
    """
    Enable GitHub Pages for the repository
    """
    try:
        from app.models.schemas import GitConfig
        git_config = GitConfig(repositoryUrl=repo_url, token=token)
        
        result = await git_service.enable_github_pages(git_config, source_branch)
        return result
        
    except Exception as e:
        logger.error(f"Error enabling GitHub Pages: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))