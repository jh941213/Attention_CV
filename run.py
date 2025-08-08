#!/usr/bin/env python3
"""
AI GitHub Pages Generator - 통합 실행 스크립트
프론트엔드와 백엔드를 모두 시작합니다.
"""

import os
import sys
import subprocess
import time
import signal
from pathlib import Path

# 색상 출력을 위한 클래스
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_colored(message, color=Colors.OKGREEN):
    print(f"{color}{message}{Colors.ENDC}")

def print_header():
    print_colored("""
🤖 AI GitHub Pages Generator
============================
LangChain + Context7 + Multi-Provider AI
""", Colors.HEADER)

def check_requirements():
    """필요한 요구사항들을 확인합니다"""
    print_colored("📋 요구사항 확인 중...", Colors.OKBLUE)
    
    # Python 버전 확인
    python_version = sys.version_info
    if python_version.major < 3 or python_version.minor < 11:
        print_colored("❌ Python 3.11 이상이 필요합니다.", Colors.FAIL)
        sys.exit(1)
    print_colored(f"✅ Python {python_version.major}.{python_version.minor}", Colors.OKGREEN)
    
    # uv 확인
    uv_available = True
    try:
        result = subprocess.run(['uv', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print_colored(f"✅ uv {result.stdout.strip()}", Colors.OKGREEN)
        else:
            print_colored("⚠️  uv가 설치되지 않았습니다. pip를 사용합니다.", Colors.WARNING)
            uv_available = False
    except (subprocess.CalledProcessError, FileNotFoundError):
        print_colored("⚠️  uv가 설치되지 않았습니다. pip를 사용합니다.", Colors.WARNING)
        uv_available = False
    
    # Node.js 확인
    try:
        result = subprocess.run(['node', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print_colored(f"✅ Node.js {result.stdout.strip()}", Colors.OKGREEN)
        else:
            raise subprocess.CalledProcessError(1, 'node')
    except (subprocess.CalledProcessError, FileNotFoundError):
        print_colored("❌ Node.js가 설치되지 않았습니다.", Colors.FAIL)
        sys.exit(1)
    
    # npm 확인
    try:
        result = subprocess.run(['npm', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print_colored(f"✅ npm {result.stdout.strip()}", Colors.OKGREEN)
        else:
            raise subprocess.CalledProcessError(1, 'npm')
    except (subprocess.CalledProcessError, FileNotFoundError):
        print_colored("❌ npm이 설치되지 않았습니다.", Colors.FAIL)
        sys.exit(1)
    
    return uv_available

def install_dependencies(use_uv=True):
    """의존성을 설치합니다"""
    print_colored("\n📦 의존성 설치 중...", Colors.OKBLUE)
    
    # .env 파일 체크
    if not os.path.exists('.env'):
        if os.path.exists('.env.example'):
            print_colored("📄 .env 파일을 생성합니다...", Colors.WARNING)
            subprocess.run(['cp', '.env.example', '.env'])
        else:
            print_colored("⚠️  .env.example 파일이 없습니다.", Colors.WARNING)
    
    # Python 의존성 설치
    print_colored("🐍 Python 의존성 설치 중...", Colors.OKBLUE)
    try:
        if use_uv:
            print_colored("📦 uv를 사용하여 의존성을 설치합니다...", Colors.OKCYAN)
            subprocess.run(['uv', 'sync'], check=True)
            print_colored("✅ Python 의존성 설치 완료 (uv)", Colors.OKGREEN)
        else:
            print_colored("📦 pip를 사용하여 의존성을 설치합니다...", Colors.OKCYAN)
            subprocess.run([sys.executable, '-m', 'pip', 'install', '-e', '.'], check=True)
            print_colored("✅ Python 의존성 설치 완료 (pip)", Colors.OKGREEN)
    except subprocess.CalledProcessError:
        print_colored("❌ Python 의존성 설치 실패", Colors.FAIL)
        if use_uv:
            print_colored("💡 uv 설치 실패. pip로 재시도합니다...", Colors.WARNING)
            try:
                subprocess.run([sys.executable, '-m', 'pip', 'install', '-e', '.'], check=True)
                print_colored("✅ Python 의존성 설치 완료 (pip)", Colors.OKGREEN)
            except subprocess.CalledProcessError:
                print_colored("❌ pip 설치도 실패했습니다.", Colors.FAIL)
                sys.exit(1)
        else:
            sys.exit(1)
    
    # Node.js 의존성 설치
    frontend_dir = Path('frontend')
    if frontend_dir.exists():
        print_colored("📦 Node.js 의존성 설치 중...", Colors.OKBLUE)
        try:
            subprocess.run(['npm', 'install'], cwd=frontend_dir, check=True)
            print_colored("✅ Node.js 의존성 설치 완료", Colors.OKGREEN)
        except subprocess.CalledProcessError:
            print_colored("❌ Node.js 의존성 설치 실패", Colors.FAIL)
            sys.exit(1)
    else:
        print_colored("❌ frontend 디렉터리를 찾을 수 없습니다.", Colors.FAIL)
        sys.exit(1)

def start_backend():
    """백엔드 서버를 시작합니다"""
    print_colored("🚀 백엔드 서버 시작 중...", Colors.OKBLUE)
    
    backend_dir = Path('backend')
    if backend_dir.exists():
        # backend 디렉터리 내에서 uvicorn 실행
        cmd = [sys.executable, '-m', 'uvicorn', 'app.main:app', '--reload', '--host', '0.0.0.0', '--port', '8000']
        return subprocess.Popen(cmd, cwd=backend_dir)
    else:
        # 현재 디렉터리에서 main.py 실행
        return subprocess.Popen([sys.executable, 'main.py'])

def start_frontend():
    """프론트엔드 서버를 시작합니다"""
    print_colored("🎨 프론트엔드 서버 시작 중...", Colors.OKBLUE)
    
    frontend_dir = Path('frontend')
    if frontend_dir.exists():
        return subprocess.Popen(['npm', 'run', 'dev'], cwd=frontend_dir)
    else:
        print_colored("❌ frontend 디렉터리를 찾을 수 없습니다.", Colors.FAIL)
        return None

def main():
    """메인 함수"""
    # 현재 디렉터리 변경
    script_dir = Path(__file__).parent.absolute()
    os.chdir(script_dir)
    
    print_header()
    
    # 요구사항 확인
    uv_available = check_requirements()
    
    # 의존성 설치 (선택사항)
    install_choice = input("\n📦 의존성을 설치하시겠습니까? (y/N): ").lower()
    if install_choice in ['y', 'yes']:
        install_dependencies(use_uv=uv_available)
    
    print_colored("\n🚀 서버 시작 중...", Colors.HEADER)
    
    # 서버들을 저장할 리스트
    processes = []
    
    try:
        # 백엔드 시작
        backend_process = start_backend()
        processes.append(backend_process)
        time.sleep(2)  # 백엔드가 먼저 시작되도록 대기
        
        # 프론트엔드 시작
        frontend_process = start_frontend()
        if frontend_process:
            processes.append(frontend_process)
        
        print_colored("\n✅ 서버가 성공적으로 시작되었습니다!", Colors.OKGREEN)
        print_colored("🌐 프론트엔드: http://localhost:3000", Colors.OKCYAN)
        print_colored("🔧 백엔드 API: http://localhost:8000", Colors.OKCYAN)
        print_colored("📚 API 문서: http://localhost:8000/api/docs", Colors.OKCYAN)
        print_colored("\n⏹️  종료하려면 Ctrl+C를 누르세요", Colors.WARNING)
        
        # 모든 프로세스가 실행될 때까지 대기
        for process in processes:
            process.wait()
            
    except KeyboardInterrupt:
        print_colored("\n🛑 서버를 종료합니다...", Colors.WARNING)
        
        # 모든 프로세스 종료
        for process in processes:
            try:
                process.terminate()
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
        
        print_colored("✅ 서버가 정상적으로 종료되었습니다.", Colors.OKGREEN)
    
    except Exception as e:
        print_colored(f"❌ 오류 발생: {str(e)}", Colors.FAIL)
        
        # 오류 발생 시 모든 프로세스 종료
        for process in processes:
            try:
                process.terminate()
            except:
                pass
        sys.exit(1)

if __name__ == "__main__":
    main()