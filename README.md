# Attention CV 🚀

AI-powered GitHub Pages CV generator with FastAPI + Next.js

## About

Create professional CVs through AI conversation and deploy to GitHub Pages.

## Tech Stack

- **Backend**: FastAPI, Python 3.11+, LangChain, OpenAI/Claude
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Others**: Redis, Git integration, Live code preview

## Quick Start

### Auto Setup (Recommended)
```bash
# Mac/Linux
chmod +x start.sh
./start.sh

# Windows
start.bat
```

### Manual Setup
```bash
# Clone repository
git clone https://github.com/jh941213/Attention_CV.git
cd attention_cv

# Setup Python environment
python3 -m venv .venv
source .venv/bin/activate  # Mac/Linux
# .venv\Scripts\activate   # Windows

# Install dependencies
pip install -e .
cd frontend && npm install && cd ..
npm install

# Configure environment (.env file)
cp .env.example .env
# Add your API keys:
# OPENAI_API_KEY=your_openai_key
# ANTHROPIC_API_KEY=your_claude_key

# Run development servers
npm run dev
```

## Access

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000  
- **API Docs**: http://localhost:8000/api/docs

## Features

- 🤖 AI-powered CV content generation
- 💬 Interactive chatbot interface
- 🎨 Real-time code editing and preview
- 📱 Responsive UI with animations
- 🔄 Git/GitHub integration
- 📊 Conversation history and memory

## Development

```bash
npm run dev        # Start development servers
npm run build      # Build frontend
npm run test       # Run tests
npm run lint       # Code linting
npm run format     # Code formatting
npm run clean      # Clean build files
```

## License

Apache License 2.0