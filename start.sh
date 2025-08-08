#!/bin/bash

echo "🚀 Starting AI GitHub Pages Generator..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📄 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created. Please edit it with your API keys."
fi

# Install Python dependencies if needed
if [ ! -d ".venv" ]; then
    echo "🐍 Setting up Python virtual environment..."
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -e .
else
    echo "🐍 Activating existing Python virtual environment..."
    source .venv/bin/activate
fi

# Install Node.js dependencies if needed
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    cd frontend
    npm install
    cd ..
fi

# Install concurrently for running both servers
if [ ! -d "node_modules" ]; then
    echo "📦 Installing development tools..."
    npm install
fi

echo "✅ Setup complete!"
echo ""
echo "🌐 Starting development servers:"
echo "   - Backend: http://localhost:8000"
echo "   - Frontend: http://localhost:3000"
echo "   - API Docs: http://localhost:8000/api/docs"
echo ""

# Start both servers
npm run dev