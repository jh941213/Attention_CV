#!/usr/bin/env node

/**
 * 🧹 LocalStorage 정리 스크립트
 * 브라우저에서 실행하여 개발 환경의 저장된 설정을 제거합니다.
 */

const clearScript = `
// 🧹 개발 환경 localStorage 정리
console.log('🔄 localStorage 정리 시작...');

// GitHub Pages 설정 제거
const configKey = 'github-pages-config';
const existingConfig = localStorage.getItem(configKey);

if (existingConfig) {
    console.log('📋 기존 설정 발견:', JSON.parse(existingConfig));
    localStorage.removeItem(configKey);
    console.log('✅ github-pages-config 제거 완료');
} else {
    console.log('ℹ️  저장된 설정이 없습니다.');
}

// 기타 관련 키들도 제거
const keysToRemove = [
    'github-pages-config',
    'user-config',
    'ai-config',
    'chat-config',
    'azure-config'
];

keysToRemove.forEach(key => {
    if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        console.log(\`🗑️  \${key} 제거됨\`);
    }
});

// sessionStorage도 정리
Object.keys(sessionStorage).forEach(key => {
    if (key.includes('github-pages') || key.includes('chat') || key.includes('config')) {
        sessionStorage.removeItem(key);
        console.log(\`🗑️  sessionStorage에서 \${key} 제거됨\`);
    }
});

console.log('✨ localStorage 정리 완료!');
console.log('🔄 페이지를 새로고침하면 깨끗한 상태로 시작됩니다.');

// 페이지 새로고침 여부 묻기
if (confirm('페이지를 새로고침하여 깨끗한 상태로 시작하시겠습니까?')) {
    location.reload();
}
`;

console.log('🧹 브라우저 localStorage 정리 스크립트');
console.log('=' .repeat(60));
console.log('📋 브라우저 개발자 도구 Console에서 다음 코드를 실행하세요:\n');
console.log(clearScript);
console.log('\n' + '=' .repeat(60));
console.log(`
🚀 사용법:
1. 브라우저에서 F12 (개발자 도구 열기)
2. Console 탭으로 이동  
3. 위의 코드를 복사해서 붙여넣기 후 Enter
4. localStorage가 정리되고 페이지 새로고침 됩니다

또는 간단히 브라우저에서:
- Ctrl+Shift+Delete (Cmd+Shift+Delete on Mac)
- "localhost:3000" 사이트 데이터 삭제
`);