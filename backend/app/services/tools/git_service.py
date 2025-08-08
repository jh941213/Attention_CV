from github import Github, GithubException, InputGitAuthor
import tempfile
import os
import shutil
from typing import List, Dict, Any, Optional
import logging
from urllib.parse import urlparse
import base64

from app.models.schemas import FileOperation, GitConfig, GitOperationResponse

logger = logging.getLogger(__name__)


class GitHubService:
    def __init__(self, token: str, repo_url: str):
        self.token = token
        self.repo_url = repo_url
        self.github = Github(token)
        
        # Parse repository info from URL
        parsed_url = urlparse(repo_url)
        if parsed_url.hostname == 'github.com':
            path_parts = parsed_url.path.strip('/').split('/')
            if len(path_parts) >= 2:
                self.repo_owner = path_parts[0]
                # Only remove .git suffix, not .github.io
                repo_name = path_parts[1]
                if repo_name.endswith('.git'):
                    repo_name = repo_name[:-4]
                self.repo_name = repo_name
            else:
                raise ValueError(f"Invalid GitHub URL: {repo_url}")
        else:
            raise ValueError(f"URL is not a GitHub repository: {repo_url}")

    async def validate_access(self) -> bool:
        """Validate GitHub token and repository access"""
        try:
            repo = self.github.get_repo(f"{self.repo_owner}/{self.repo_name}")
            # Try to get repository info to verify access
            repo.full_name
            return True
        except GithubException as e:
            logger.error(f"GitHub access validation failed: {str(e)}")
            return False

    async def get_repository_info(self) -> Dict[str, Any]:
        """Get repository information"""
        try:
            repo = self.github.get_repo(f"{self.repo_owner}/{self.repo_name}")
            
            # Check if GitHub Pages is enabled
            pages_info = None
            try:
                # Try to get pages info using the new API method
                pages = repo.pages
                if pages:
                    pages_info = {
                        "enabled": True,
                        "url": getattr(pages, 'html_url', f"https://{self.repo_owner}.github.io/{self.repo_name}/"),
                        "source": getattr(pages, 'source', None),
                        "status": getattr(pages, 'status', 'unknown')
                    }
                else:
                    pages_info = {"enabled": False}
            except (GithubException, AttributeError):
                # Fallback: assume pages might be enabled for .github.io repos
                if self.repo_name.endswith('.github.io'):
                    pages_info = {
                        "enabled": True,
                        "url": f"https://{self.repo_name}/",
                        "source": "unknown",
                        "status": "assumed"
                    }
                else:
                    pages_info = {"enabled": False}
            
            return {
                "name": repo.name,
                "full_name": repo.full_name,
                "description": repo.description,
                "default_branch": repo.default_branch,
                "private": repo.private,
                "pages": pages_info,
                "clone_url": repo.clone_url,
                "html_url": repo.html_url
            }
        except GithubException as e:
            logger.error(f"Error getting repository info: {str(e)}")
            raise Exception(f"Failed to get repository info: {str(e)}")

    async def commit_and_push(
        self,
        files: List[FileOperation],
        commit_message: str,
        git_config: GitConfig
    ) -> GitOperationResponse:
        """Commit files to GitHub repository using simplified GitHub API"""
        try:
            repo = self.github.get_repo(f"{self.repo_owner}/{self.repo_name}")
            
            # For simplicity, handle single file updates using contents API
            if len(files) == 1:
                file_op = files[0]
                try:
                    # Try to get existing file
                    existing_file = repo.get_contents(file_op.file_path or file_op.filename)
                    
                    # Update existing file
                    result = repo.update_file(
                        path=file_op.file_path or file_op.filename,
                        message=commit_message,
                        content=file_op.content,
                        sha=existing_file.sha,
                        author=InputGitAuthor(git_config.username, git_config.email),
                        committer=InputGitAuthor(git_config.username, git_config.email)
                    )
                    
                except GithubException as e:
                    if e.status == 404:
                        # File doesn't exist, create new file
                        result = repo.create_file(
                            path=file_op.file_path or file_op.filename,
                            message=commit_message,
                            content=file_op.content,
                            author=InputGitAuthor(git_config.username, git_config.email),
                            committer=InputGitAuthor(git_config.username, git_config.email)
                        )
                    else:
                        raise e
                
                # Get Pages URL
                pages_url = None
                try:
                    # Try different ways to get pages info
                    if hasattr(repo, 'get_pages'):
                        pages = repo.get_pages()
                        pages_url = pages.html_url
                    elif hasattr(repo, 'pages'):
                        pages = repo.pages
                        pages_url = getattr(pages, 'html_url', None)
                    
                    # Fallback for .github.io repos
                    if not pages_url and self.repo_name.endswith('.github.io'):
                        pages_url = f"https://{self.repo_name}/"
                except (GithubException, AttributeError):
                    # Pages might not be enabled yet or API changed
                    if self.repo_name.endswith('.github.io'):
                        pages_url = f"https://{self.repo_name}/"
                
                return GitOperationResponse(
                    success=True,
                    message=f"Successfully committed {file_op.filename}",
                    commit_sha=result['commit'].sha,
                    pages_url=pages_url
                )
            
            else:
                # Handle multiple files with tree API (original implementation)
                # Get the latest commit SHA from the default branch
                default_branch = repo.default_branch
                branch = repo.get_branch(default_branch)
                base_tree = repo.get_git_tree(branch.commit.sha, recursive=True)
                
                # Prepare tree elements for the new commit
                tree_elements = []
                
                for file_op in files:
                    if file_op.operation == "create" or file_op.operation == "update":
                        tree_elements.append({
                            "path": file_op.file_path or file_op.filename,
                            "mode": "100644",
                            "type": "blob",
                            "content": file_op.content
                        })
                    elif file_op.operation == "delete":
                        # To delete a file, we don't include it in the new tree
                        pass
                
                if not tree_elements:
                    return GitOperationResponse(
                        success=False,
                        message="No files to commit",
                        commit_sha=None
                    )
                
                # Create new tree
                new_tree = repo.create_git_tree(tree_elements)
                
                # Create commit
                parent_commit = repo.get_git_commit(branch.commit.sha)
                new_commit = repo.create_git_commit(
                    message=commit_message,
                    tree=new_tree,
                    parents=[parent_commit]
                )
                
                # Update branch reference
                branch_ref = repo.get_git_ref(f"heads/{default_branch}")
                branch_ref.edit(new_commit.sha)
                
                # Get Pages URL
                pages_url = None
                try:
                    # Try different ways to get pages info
                    if hasattr(repo, 'get_pages'):
                        pages = repo.get_pages()
                        pages_url = pages.html_url
                    elif hasattr(repo, 'pages'):
                        pages = repo.pages
                        pages_url = getattr(pages, 'html_url', None)
                    
                    # Fallback for .github.io repos
                    if not pages_url and self.repo_name.endswith('.github.io'):
                        pages_url = f"https://{self.repo_name}/"
                except (GithubException, AttributeError):
                    if self.repo_name.endswith('.github.io'):
                        pages_url = f"https://{self.repo_name}/"
                
                return GitOperationResponse(
                    success=True,
                    message=f"Successfully committed {len(files)} files",
                    commit_sha=new_commit.sha,
                    pages_url=pages_url
                )
            
        except GithubException as e:
            logger.error(f"GitHub API error: {str(e)}")
            return GitOperationResponse(
                success=False,
                message=f"GitHub error: {str(e)}",
                commit_sha=None
            )
        except Exception as e:
            logger.error(f"Error committing to GitHub: {str(e)}")
            logger.error(f"Exception type: {type(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return GitOperationResponse(
                success=False,
                message=f"Commit error: {str(e)}",
                commit_sha=None
            )

    async def enable_github_pages(self, source_branch: str = "main") -> Dict[str, Any]:
        """Enable GitHub Pages for the repository"""
        try:
            repo = self.github.get_repo(f"{self.repo_owner}/{self.repo_name}")
            
            # Try to create or update Pages configuration
            try:
                pages = repo.create_pages_site(
                    source={"branch": source_branch, "path": "/"}
                )
                return {
                    "success": True,
                    "message": "GitHub Pages enabled successfully",
                    "url": pages.html_url
                }
            except GithubException as e:
                if e.status == 409:  # Pages already exists
                    pages = repo.get_pages()
                    return {
                        "success": True,
                        "message": "GitHub Pages is already enabled",
                        "url": pages.html_url
                    }
                else:
                    raise e
                    
        except GithubException as e:
            logger.error(f"Error enabling GitHub Pages: {str(e)}")
            return {
                "success": False,
                "message": f"Failed to enable GitHub Pages: {str(e)}"
            }

    async def get_pages_status(self) -> Dict[str, Any]:
        """Get GitHub Pages deployment status"""
        try:
            repo = self.github.get_repo(f"{self.repo_owner}/{self.repo_name}")
            pages = repo.get_pages()
            
            return {
                "enabled": True,
                "url": pages.html_url,
                "status": pages.status,
                "source": {
                    "branch": pages.source.branch,
                    "path": pages.source.path
                }
            }
        except GithubException as e:
            if e.status == 404:
                return {"enabled": False, "message": "GitHub Pages is not enabled"}
            else:
                logger.error(f"Error getting Pages status: {str(e)}")
                raise Exception(f"Failed to get Pages status: {str(e)}")

    async def get_file_content(self, file_path: str) -> Optional[str]:
        """Get content of a file from the repository"""
        try:
            repo = self.github.get_repo(f"{self.repo_owner}/{self.repo_name}")
            file_content = repo.get_contents(file_path)
            
            if isinstance(file_content, list):
                # It's a directory, not a file
                return None
            
            return file_content.decoded_content.decode('utf-8')
        except GithubException:
            # File doesn't exist
            return None

    async def list_repository_files(self, path: str = "") -> List[Dict[str, Any]]:
        """List files in the repository"""
        try:
            repo = self.github.get_repo(f"{self.repo_owner}/{self.repo_name}")
            contents = repo.get_contents(path)
            
            files = []
            for content in contents:
                files.append({
                    "name": content.name,
                    "path": content.path,
                    "type": content.type,  # "file" or "dir"
                    "size": content.size if content.type == "file" else None,
                    "sha": content.sha
                })
            
            return files
        except GithubException as e:
            logger.error(f"Error listing repository files: {str(e)}")
            return []


class GitServiceWrapper:
    """Wrapper service to match the expected API interface"""
    
    async def validate_repository_access(self, git_config: GitConfig) -> Dict[str, Any]:
        """Validate GitHub repository access"""
        try:
            service = GitHubService(git_config.token, git_config.repositoryUrl)
            is_valid = await service.validate_access()
            
            if is_valid:
                repo_info = await service.get_repository_info()
                return {
                    'valid': True,
                    'pages_enabled': repo_info['pages']['enabled'],
                    'pages_url': repo_info['pages'].get('url')
                }
            else:
                return {'valid': False, 'error': 'Repository access validation failed'}
                
        except Exception as e:
            logger.error(f"Error validating repository access: {str(e)}")
            return {'valid': False, 'error': str(e)}
    
    async def commit_files(self, config: GitConfig, files: List[FileOperation], commit_message: str) -> Dict[str, Any]:
        """Commit files to GitHub repository"""
        try:
            service = GitHubService(config.token, config.repositoryUrl)
            result = await service.commit_and_push(files, commit_message, config)
            
            return {
                'success': result.success,
                'commit_sha': result.commit_sha,
                'pages_url': result.pages_url,
                'error': result.message if not result.success else None
            }
            
        except Exception as e:
            logger.error(f"Error committing files: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def enable_github_pages(self, git_config: GitConfig, source_branch: str = "main") -> Dict[str, Any]:
        """Enable GitHub Pages"""
        try:
            service = GitHubService(git_config.token, git_config.repositoryUrl)
            return await service.enable_github_pages(source_branch)
            
        except Exception as e:
            logger.error(f"Error enabling GitHub Pages: {str(e)}")
            return {'success': False, 'error': str(e)}


# Create singleton instance
git_service = GitServiceWrapper()