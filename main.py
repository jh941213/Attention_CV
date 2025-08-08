#!/usr/bin/env python3
"""
AI GitHub Pages Generator
Entry point for running the FastAPI backend server
"""

import uvicorn
import os
from pathlib import Path

def main():
    """Run the FastAPI application"""
    # Change to backend directory
    backend_dir = Path(__file__).parent / "backend"
    if backend_dir.exists():
        os.chdir(backend_dir)
    
    # Run the FastAPI app
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True,
        reload_dirs=["app"]
    )


if __name__ == "__main__":
    main()
