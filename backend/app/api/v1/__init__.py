from fastapi import APIRouter
from .endpoints import chat, github, config, git

api_router = APIRouter()

api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(github.router, prefix="/github", tags=["github"])
api_router.include_router(config.router, prefix="/config", tags=["config"])
api_router.include_router(git.router, prefix="/git", tags=["git"])