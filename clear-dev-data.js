#!/usr/bin/env node

/**
 * Development Data Cleanup Script
 * 배포 전 개발 환경에서 저장된 민감한 데이터를 제거하는 스크립트
 */

console.log('🧹 개발 환경 데이터 정리 중...\n');

// 브라우저에서 실행할 JavaScript 코드 생성
const clearBrowserStorageScript = `
// 개발 환경에서 저장된 민감한 데이터 제거
console.log('🔒 로컬 스토리지에서 개발 데이터 제거 중...');

// GitHub Pages 설정 제거
localStorage.removeItem('github-pages-config');

// 기타 민감한 데이터 키들 제거
const sensitiveKeys = [
  'azure-openai-key',
  'openai-api-key', 
  'anthropic-api-key',
  'github-token',
  'api-keys',
  'user-config',
  'chat-config'
];

sensitiveKeys.forEach(key => {
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
});

// IndexedDB 데이터 제거 (있는 경우)
if (typeof indexedDB !== 'undefined') {
  indexedDB.databases().then(databases => {
    databases.forEach(db => {
      if (db.name && db.name.includes('github-pages') || db.name.includes('chat')) {
        indexedDB.deleteDatabase(db.name);
        console.log(\`🗑️  삭제된 데이터베이스: \${db.name}\`);
      }
    });
  });
}

console.log('✅ 브라우저 데이터 정리 완료!');
alert('개발 데이터가 성공적으로 제거되었습니다. 이제 안전하게 배포할 수 있습니다.');
`;

console.log('📋 브라우저에서 실행할 코드:');
console.log('=' .repeat(60));
console.log(clearBrowserStorageScript);
console.log('=' .repeat(60));

console.log(`
🚀 배포 전 체크리스트:

1. 브라우저 개발자 도구 열기 (F12)
2. Console 탭으로 이동
3. 위의 코드를 복사해서 콘솔에 붙여넣고 실행
4. "개발 데이터가 성공적으로 제거되었습니다" 메시지 확인

또는 애플리케이션을 새로 빌드하기 전에:
- 브라우저에서 Ctrl+Shift+Delete (또는 Cmd+Shift+Delete)
- 모든 사이트 데이터 삭제 선택
- localhost:3000과 관련된 데이터 모두 삭제

⚠️  중요: 배포 후에는 사용자들이 각자 API 키를 설정해야 합니다.
`);

// package.json에 스크립트 추가 제안
console.log(`
📦 package.json에 추가할 스크립트:

"scripts": {
  "clean:dev": "node clear-dev-data.js",
  "pre-deploy": "npm run clean:dev && npm run build"
}
`);