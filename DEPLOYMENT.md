# Deployment Guide

## Pre-deployment Security Checklist ✅

### Environment Configuration
- [ ] Remove all API keys and tokens from `.env` file
- [ ] Copy `.env.production` and configure for your domain
- [ ] Generate a strong `SECRET_KEY` for production
- [ ] Update `NEXT_PUBLIC_API_URL` to your production domain
- [ ] Configure `ALLOWED_HOSTS` with your domain(s)
- [ ] Set `DEBUG=False` in production

### 🚨 중요: 개발 환경 데이터 정리
배포하기 전에 브라우저에 저장된 개발 데이터를 제거해야 합니다:

1. **자동 정리 (권장)**:
   ```bash
   node clear-dev-data.js
   ```
   위 스크립트가 제공하는 JavaScript 코드를 브라우저 콘솔에서 실행

2. **수동 정리**:
   - 브라우저에서 F12 → Application/Storage 탭
   - Local Storage에서 `github-pages-config` 삭제
   - Session Storage 모든 데이터 삭제
   - 또는 브라우저 설정에서 localhost:3000 관련 모든 데이터 삭제

### API Keys Setup
Configure these in your production environment (not in code):
- `AZURE_OPENAI_API_KEY` - Your Azure OpenAI API key
- `AZURE_OPENAI_ENDPOINT` - Your Azure OpenAI endpoint
- `GITHUB_TOKEN` - GitHub personal access token
- `OPENAI_API_KEY` - OpenAI API key (optional)
- `ANTHROPIC_API_KEY` - Anthropic API key (optional)

## Deployment Steps

### 1. Backend Deployment
```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DEBUG=False
export SECRET_KEY="your-strong-secret-key"
export ALLOWED_HOSTS="your-domain.com"

# Run the backend
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

### 2. Frontend Deployment
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Build for production
npm run build

# Start the application
npm start
```

### 3. Environment Variables for Production

Create a `.env.production.local` file (this will be ignored by git):
```env
NEXT_PUBLIC_API_URL=https://your-domain.com/api/v1
AZURE_OPENAI_ENDPOINT=your-actual-endpoint
AZURE_OPENAI_API_KEY=your-actual-key
GITHUB_TOKEN=your-actual-token
SECRET_KEY=your-actual-secret-key
DEBUG=False
```

## Docker Deployment (Optional)

### Backend Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY backend/ ./backend/
COPY .env.production .env

EXPOSE 8000

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Frontend Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci --only=production

COPY frontend/ .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

## Security Notes

1. **Never commit sensitive data**: All API keys should be environment variables
2. **Use strong secrets**: Generate cryptographically secure keys
3. **Enable HTTPS**: Use SSL/TLS certificates in production
4. **Configure CORS**: Restrict CORS to your domain only
5. **Rate limiting**: Consider implementing rate limiting for API endpoints

## Platform-Specific Deployment

### Vercel (Frontend)
1. Connect your GitHub repository
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### Railway/Heroku (Backend)
1. Connect your GitHub repository
2. Set environment variables in platform dashboard
3. Configure buildpacks if needed

### AWS/Google Cloud
1. Use container services (ECS, Cloud Run)
2. Configure environment variables through platform tools
3. Set up load balancers and SSL certificates

## Post-Deployment Checklist

- [ ] Test all API endpoints
- [ ] Verify environment variables are loaded correctly
- [ ] Check that sensitive data is not exposed
- [ ] Test GitHub integration functionality
- [ ] Verify AI API connections work
- [ ] Monitor logs for errors
- [ ] Set up monitoring and alerting

## Troubleshooting

### Common Issues
1. **API keys not working**: Check environment variable names and values
2. **CORS errors**: Verify frontend URL is in ALLOWED_HOSTS
3. **GitHub integration fails**: Verify token permissions and repository access
4. **Database connection issues**: Check database URL and credentials