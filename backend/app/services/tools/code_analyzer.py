import os
import tempfile
import shutil
from typing import Dict, List, Any, Optional
import git
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class CodeAnalyzer:
    def __init__(self):
        self.supported_extensions = {
            '.html': 'HTML',
            '.htm': 'HTML',
            '.css': 'CSS',
            '.js': 'JavaScript',
            '.jsx': 'React JSX',
            '.ts': 'TypeScript',
            '.tsx': 'React TypeScript',
            '.json': 'JSON',
            '.md': 'Markdown',
            '.py': 'Python',
            '.yml': 'YAML',
            '.yaml': 'YAML'
        }

    async def analyze_repository(self, repo_url: str, github_token: str) -> Dict[str, Any]:
        """Analyze a GitHub repository structure"""
        temp_dir = None
        try:
            # Clone repository to temporary directory
            temp_dir = tempfile.mkdtemp()
            
            # Prepare git URL with token for authentication
            if repo_url.startswith('https://github.com/'):
                auth_url = repo_url.replace('https://github.com/', f'https://{github_token}@github.com/')
            else:
                auth_url = repo_url
            
            repo = git.Repo.clone_from(auth_url, temp_dir)
            
            # Analyze the repository
            analysis = {
                'structure': self._analyze_structure(temp_dir),
                'technologies': self._detect_technologies(temp_dir),
                'file_count': self._count_files(temp_dir),
                'pages_files': self._detect_pages_files(temp_dir),
                'recommendations': self._generate_recommendations(temp_dir)
            }
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error analyzing repository: {str(e)}")
            raise Exception(f"Repository analysis failed: {str(e)}")
        finally:
            # Clean up temporary directory
            if temp_dir and os.path.exists(temp_dir):
                shutil.rmtree(temp_dir, ignore_errors=True)

    def _analyze_structure(self, repo_path: str) -> Dict[str, Any]:
        """Analyze repository directory structure"""
        structure = {
            'directories': [],
            'files': [],
            'depth': 0
        }
        
        try:
            for root, dirs, files in os.walk(repo_path):
                # Skip .git directory
                if '.git' in dirs:
                    dirs.remove('.git')
                
                # Calculate relative path and depth
                rel_path = os.path.relpath(root, repo_path)
                if rel_path == '.':
                    rel_path = ''
                
                depth = len(rel_path.split(os.sep)) if rel_path else 0
                structure['depth'] = max(structure['depth'], depth)
                
                # Add directories
                if rel_path and rel_path not in structure['directories']:
                    structure['directories'].append(rel_path)
                
                # Add files with metadata
                for file in files:
                    file_path = os.path.join(rel_path, file) if rel_path else file
                    file_ext = Path(file).suffix.lower()
                    
                    structure['files'].append({
                        'path': file_path,
                        'name': file,
                        'extension': file_ext,
                        'type': self.supported_extensions.get(file_ext, 'Unknown'),
                        'size': self._get_file_size(os.path.join(root, file))
                    })
            
        except Exception as e:
            logger.error(f"Error analyzing structure: {str(e)}")
        
        return structure

    def _detect_technologies(self, repo_path: str) -> List[str]:
        """Detect technologies used in the repository"""
        technologies = set()
        
        try:
            for root, dirs, files in os.walk(repo_path):
                if '.git' in dirs:
                    dirs.remove('.git')
                
                for file in files:
                    file_path = os.path.join(root, file)
                    file_ext = Path(file).suffix.lower()
                    
                    # Detect by file extension
                    if file_ext in self.supported_extensions:
                        tech = self.supported_extensions[file_ext]
                        technologies.add(tech)
                    
                    # Detect specific files
                    file_name = file.lower()
                    if file_name == 'package.json':
                        technologies.add('Node.js')
                        # Try to read package.json for more specific technologies
                        try:
                            with open(file_path, 'r', encoding='utf-8') as f:
                                import json
                                package_data = json.load(f)
                                deps = {**package_data.get('dependencies', {}), 
                                       **package_data.get('devDependencies', {})}
                                
                                if 'react' in deps:
                                    technologies.add('React')
                                if 'vue' in deps:
                                    technologies.add('Vue.js')
                                if 'angular' in deps:
                                    technologies.add('Angular')
                                if 'next' in deps:
                                    technologies.add('Next.js')
                                if 'gatsby' in deps:
                                    technologies.add('Gatsby')
                        except:
                            pass
                    
                    elif file_name == '_config.yml':
                        technologies.add('Jekyll')
                    elif file_name == 'requirements.txt':
                        technologies.add('Python')
                    elif file_name == 'gemfile':
                        technologies.add('Ruby')
                    elif file_name == 'dockerfile':
                        technologies.add('Docker')
        
        except Exception as e:
            logger.error(f"Error detecting technologies: {str(e)}")
        
        return sorted(list(technologies))

    def _count_files(self, repo_path: str) -> Dict[str, int]:
        """Count files by type"""
        counts = {
            'total': 0,
            'by_extension': {}
        }
        
        try:
            for root, dirs, files in os.walk(repo_path):
                if '.git' in dirs:
                    dirs.remove('.git')
                
                for file in files:
                    counts['total'] += 1
                    ext = Path(file).suffix.lower() or 'no_extension'
                    counts['by_extension'][ext] = counts['by_extension'].get(ext, 0) + 1
        
        except Exception as e:
            logger.error(f"Error counting files: {str(e)}")
        
        return counts

    def _detect_pages_files(self, repo_path: str) -> Dict[str, Any]:
        """Detect files relevant to GitHub Pages"""
        pages_info = {
            'has_index': False,
            'index_file': None,
            'has_readme': False,
            'readme_file': None,
            'config_files': [],
            'potential_pages': []
        }
        
        try:
            for root, dirs, files in os.walk(repo_path):
                if '.git' in dirs:
                    dirs.remove('.git')
                
                for file in files:
                    file_lower = file.lower()
                    file_path = os.path.relpath(os.path.join(root, file), repo_path)
                    
                    # Check for index files
                    if file_lower in ['index.html', 'index.htm'] and root == repo_path:
                        pages_info['has_index'] = True
                        pages_info['index_file'] = file_path
                    
                    # Check for README files
                    elif file_lower.startswith('readme'):
                        pages_info['has_readme'] = True
                        pages_info['readme_file'] = file_path
                    
                    # Check for Jekyll/GitHub Pages config files
                    elif file_lower in ['_config.yml', '_config.yaml']:
                        pages_info['config_files'].append(file_path)
                    
                    # Detect potential page files
                    elif Path(file).suffix.lower() in ['.html', '.htm', '.md']:
                        pages_info['potential_pages'].append(file_path)
        
        except Exception as e:
            logger.error(f"Error detecting Pages files: {str(e)}")
        
        return pages_info

    def _generate_recommendations(self, repo_path: str) -> List[str]:
        """Generate recommendations for GitHub Pages optimization"""
        recommendations = []
        
        try:
            pages_info = self._detect_pages_files(repo_path)
            technologies = self._detect_technologies(repo_path)
            
            # Check for index file
            if not pages_info['has_index']:
                recommendations.append("Add an index.html file for the main page")
            
            # Check for responsive design
            css_files = []
            for root, dirs, files in os.walk(repo_path):
                if '.git' in dirs:
                    dirs.remove('.git')
                for file in files:
                    if file.endswith('.css'):
                        css_files.append(os.path.join(root, file))
            
            if not css_files:
                recommendations.append("Add CSS files for styling")
            
            # Technology-specific recommendations
            if 'JavaScript' in technologies:
                recommendations.append("Consider optimizing JavaScript for faster loading")
            
            if 'React' in technologies:
                recommendations.append("Build and deploy the React app to a 'docs' or 'gh-pages' branch")
            
            if not pages_info['config_files'] and 'Jekyll' in technologies:
                recommendations.append("Add _config.yml for Jekyll configuration")
            
            # General recommendations
            recommendations.append("Ensure all paths use relative URLs for GitHub Pages compatibility")
            recommendations.append("Test the site locally before deploying")
            
        except Exception as e:
            logger.error(f"Error generating recommendations: {str(e)}")
        
        return recommendations

    def _get_file_size(self, file_path: str) -> int:
        """Get file size in bytes"""
        try:
            return os.path.getsize(file_path)
        except:
            return 0