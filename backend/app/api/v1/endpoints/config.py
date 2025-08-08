from fastapi import APIRouter, HTTPException
from typing import Dict, Any
import logging

from app.models.schemas import UserConfig, ErrorResponse, OpenAIModel, AnthropicModel

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/validate")
async def validate_config(config: UserConfig) -> Dict[str, Any]:
    """
    Validate user configuration (API keys, GitHub access, etc.)
    """
    try:
        validation_results = {}
        
        # Validate AI API key by creating LLM instance
        from app.services import ai_service
        try:
            llm = ai_service.create_llm(config)
            validation_results["ai_api"] = True
        except Exception as e:
            validation_results["ai_api"] = False
            validation_results["ai_error"] = str(e)
        
        # Validate GitHub access
        from app.services.git_service import git_service
        if hasattr(config, 'gitConfig') and config.gitConfig:
            github_validation = await git_service.validate_repository_access(config.gitConfig)
            validation_results["github_access"] = github_validation["valid"]
            if not github_validation["valid"]:
                validation_results["github_error"] = github_validation.get("error")
        else:
            validation_results["github_access"] = False
            validation_results["github_error"] = "No Git configuration provided"
        
        # Overall validation status
        validation_results["overall_valid"] = all(validation_results.values())
        
        return validation_results
        
    except Exception as e:
        logger.error(f"Error validating config: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/templates")
async def get_project_templates():
    """
    Get available project templates for quick setup
    """
    templates = [
        {
            "id": "static-html",
            "name": "Static HTML/CSS/JS",
            "description": "Simple static website with HTML, CSS, and JavaScript",
            "technologies": ["HTML5", "CSS3", "JavaScript"]
        },
        {
            "id": "react-spa",
            "name": "React SPA",
            "description": "Single Page Application built with React",
            "technologies": ["React", "JavaScript", "CSS"]
        },
        {
            "id": "vue-spa",
            "name": "Vue.js SPA", 
            "description": "Single Page Application built with Vue.js",
            "technologies": ["Vue.js", "JavaScript", "CSS"]
        },
        {
            "id": "jekyll-blog",
            "name": "Jekyll Blog",
            "description": "Static blog powered by Jekyll",
            "technologies": ["Jekyll", "Liquid", "Markdown"]
        },
        {
            "id": "portfolio",
            "name": "Portfolio Website",
            "description": "Personal portfolio website template",
            "technologies": ["HTML5", "CSS3", "JavaScript"]
        }
    ]
    
    return {"templates": templates}


@router.get("/ai-providers")
async def get_ai_providers():
    """
    Get list of supported AI providers
    """
    providers = [
        {
            "id": "openai",
            "name": "OpenAI",
            "description": "GPT-3.5/GPT-4 models from OpenAI",
            "api_key_url": "https://platform.openai.com/api-keys"
        },
        {
            "id": "anthropic",
            "name": "Anthropic",
            "description": "Claude models from Anthropic",
            "api_key_url": "https://console.anthropic.com/"
        }
    ]
    
    return {"providers": providers}


@router.get("/models")
async def get_available_models():
    """
    Get list of available models for each AI provider
    """
    models = {
        "openai": [
            {"id": model.value, "name": model.value.upper(), "description": f"OpenAI {model.value.replace('-', ' ').title()}"} 
            for model in OpenAIModel
        ],
        "anthropic": [
            {"id": model.value, "name": model.value.replace('-', ' ').title(), "description": f"Anthropic {model.value.replace('-', ' ').title()}"} 
            for model in AnthropicModel
        ],
        "azure_openai": [
            {"id": "deployment-based", "name": "Deployment Based", "description": "Uses your Azure deployment name"}
        ]
    }
    
    return {"models": models}