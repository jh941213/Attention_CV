#!/usr/bin/env python3
"""
🧹 Project Cleanup Script
Cleans Python cache files, temporary files, and development artifacts
"""

import os
import shutil
import sys
from pathlib import Path
import argparse
from typing import List, Set

# 🎨 Colors for terminal output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_colored(message: str, color: str = Colors.OKBLUE) -> None:
    """Print colored message to terminal"""
    print(f"{color}{message}{Colors.ENDC}")

def print_header(message: str) -> None:
    """Print header message"""
    print_colored(f"\n{'='*60}", Colors.HEADER)
    print_colored(f"🧹 {message}", Colors.HEADER + Colors.BOLD)
    print_colored(f"{'='*60}", Colors.HEADER)

def get_cleanup_patterns() -> dict:
    """Get patterns for cleanup operations"""
    return {
        "python_cache": [
            "__pycache__",
            "*.pyc",
            "*.pyo", 
            "*.pyd",
            ".Python",
            "pip-log.txt",
            "pip-delete-this-directory.txt",
        ],
        "build_artifacts": [
            "build/",
            "dist/", 
            "*.egg-info/",
            ".eggs/",
            "wheels/",
        ],
        "test_artifacts": [
            ".pytest_cache/",
            ".coverage",
            "htmlcov/",
            ".tox/",
            ".nox/",
            "coverage.xml",
            "*.cover",
            ".nyc_output",
        ],
        "ide_files": [
            ".vscode/",
            ".idea/",
            "*.swp",
            "*.swo", 
            "*~",
            ".DS_Store",
            ".DS_Store?",
            "._*",
            ".Spotlight-V100",
            ".Trashes",
            "ehthumbs.db",
            "Thumbs.db",
        ],
        "temp_files": [
            "*.tmp",
            "*.temp",
            "temp/",
            "tmp/",
            ".mypy_cache/",
            ".ruff_cache/",
        ],
        "node_artifacts": [
            "node_modules/",
            ".next/",
            "out/",
            "*.log",
            "npm-debug.log*",
            "yarn-debug.log*", 
            "yarn-error.log*",
        ],
        "env_files": [
            ".env.local",
            ".env.development.local",
            ".env.test.local",
            ".env.production.local",
        ]
    }

def find_files_to_clean(root_path: Path, patterns: List[str]) -> Set[Path]:
    """Find files and directories matching cleanup patterns"""
    items_to_clean = set()
    
    for pattern in patterns:
        if pattern.endswith('/'):
            # Directory pattern
            dir_name = pattern.rstrip('/')
            for item in root_path.rglob(dir_name):
                if item.is_dir():
                    items_to_clean.add(item)
        elif '*' in pattern:
            # Glob pattern
            for item in root_path.rglob(pattern):
                items_to_clean.add(item)
        else:
            # Exact match
            for item in root_path.rglob(pattern):
                items_to_clean.add(item)
    
    return items_to_clean

def format_size(size_bytes: int) -> str:
    """Format file size in human readable format"""
    if size_bytes == 0:
        return "0 B"
    
    size_names = ["B", "KB", "MB", "GB"]
    import math
    i = int(math.floor(math.log(size_bytes, 1024)))
    p = math.pow(1024, i)
    s = round(size_bytes / p, 2)
    return f"{s} {size_names[i]}"

def get_directory_size(path: Path) -> int:
    """Get total size of directory"""
    total_size = 0
    try:
        for file_path in path.rglob('*'):
            if file_path.is_file():
                total_size += file_path.stat().st_size
    except (OSError, PermissionError):
        pass
    return total_size

def clean_items(items: Set[Path], dry_run: bool = False) -> tuple:
    """Clean the specified items"""
    cleaned_count = 0
    total_size_saved = 0
    failed_items = []
    
    for item in sorted(items):
        try:
            if not item.exists():
                continue
                
            # Calculate size before deletion
            if item.is_file():
                size = item.stat().st_size
            else:
                size = get_directory_size(item)
            
            if dry_run:
                print_colored(f"  🗑️  Would delete: {item.relative_to(Path.cwd())} ({format_size(size)})", Colors.WARNING)
            else:
                if item.is_file():
                    item.unlink()
                else:
                    shutil.rmtree(item, ignore_errors=True)
                print_colored(f"  ✅ Deleted: {item.relative_to(Path.cwd())} ({format_size(size)})", Colors.OKGREEN)
            
            cleaned_count += 1
            total_size_saved += size
            
        except Exception as e:
            failed_items.append((item, str(e)))
            print_colored(f"  ❌ Failed to delete {item}: {e}", Colors.FAIL)
    
    return cleaned_count, total_size_saved, failed_items

def main():
    """Main cleanup function"""
    parser = argparse.ArgumentParser(description="🧹 Clean up project files")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be deleted without actually deleting")
    parser.add_argument("--category", choices=["python", "build", "test", "ide", "temp", "node", "env", "all"], 
                       default="all", help="Category of files to clean")
    parser.add_argument("--path", type=str, default=".", help="Root path to clean (default: current directory)")
    
    args = parser.parse_args()
    
    root_path = Path(args.path).resolve()
    
    if not root_path.exists():
        print_colored(f"❌ Path does not exist: {root_path}", Colors.FAIL)
        sys.exit(1)
    
    print_header(f"Project Cleanup Tool - {root_path.name}")
    
    if args.dry_run:
        print_colored("🔍 DRY RUN MODE - No files will be deleted", Colors.WARNING + Colors.BOLD)
    
    cleanup_patterns = get_cleanup_patterns()
    
    # Determine which categories to clean
    if args.category == "all":
        categories_to_clean = list(cleanup_patterns.keys())
    elif args.category == "python":
        categories_to_clean = ["python_cache"]
    elif args.category == "build": 
        categories_to_clean = ["build_artifacts"]
    elif args.category == "test":
        categories_to_clean = ["test_artifacts"]
    elif args.category == "ide":
        categories_to_clean = ["ide_files"]
    elif args.category == "temp":
        categories_to_clean = ["temp_files"]
    elif args.category == "node":
        categories_to_clean = ["node_artifacts"]
    elif args.category == "env":
        categories_to_clean = ["env_files"]
    
    total_cleaned = 0
    total_size_saved = 0
    all_failed_items = []
    
    for category in categories_to_clean:
        patterns = cleanup_patterns[category]
        print_colored(f"\n🔍 Scanning for {category.replace('_', ' ')}...", Colors.OKBLUE)
        
        items_to_clean = find_files_to_clean(root_path, patterns)
        
        if not items_to_clean:
            print_colored("  ✨ Nothing to clean in this category", Colors.OKGREEN)
            continue
        
        print_colored(f"  📁 Found {len(items_to_clean)} items to clean", Colors.OKCYAN)
        
        cleaned_count, size_saved, failed_items = clean_items(items_to_clean, args.dry_run)
        
        total_cleaned += cleaned_count
        total_size_saved += size_saved
        all_failed_items.extend(failed_items)
    
    # Summary
    print_header("Cleanup Summary")
    
    if args.dry_run:
        print_colored(f"🔍 Would clean {total_cleaned} items", Colors.WARNING)
        print_colored(f"💾 Would save {format_size(total_size_saved)} of disk space", Colors.WARNING)
    else:
        print_colored(f"✅ Cleaned {total_cleaned} items", Colors.OKGREEN)
        print_colored(f"💾 Saved {format_size(total_size_saved)} of disk space", Colors.OKGREEN)
    
    if all_failed_items:
        print_colored(f"⚠️  {len(all_failed_items)} items could not be cleaned:", Colors.WARNING)
        for item, error in all_failed_items:
            print_colored(f"  ❌ {item}: {error}", Colors.FAIL)
    
    if not args.dry_run and total_cleaned > 0:
        print_colored("🎉 Cleanup completed successfully!", Colors.OKGREEN + Colors.BOLD)
    elif args.dry_run and total_cleaned > 0:
        print_colored("📝 Run without --dry-run to actually clean the files", Colors.OKCYAN)
    else:
        print_colored("✨ Project is already clean!", Colors.OKGREEN)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print_colored("\n❌ Cleanup interrupted by user", Colors.WARNING)
        sys.exit(1)
    except Exception as e:
        print_colored(f"\n💥 Unexpected error: {e}", Colors.FAIL)
        sys.exit(1)