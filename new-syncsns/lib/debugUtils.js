// 개발 환경에서 디버깅을 위한 유틸리티 함수들

/**
 * 환경변수 검증 함수
 * @param {string} envVar - 검증할 환경변수명
 * @param {string} value - 환경변수 값
 * @returns {boolean} - 유효성 여부
 */
export function validateEnvVar(envVar, value) {
  if (!value) {
    console.error(`❌ ${envVar} 환경변수가 설정되지 않았습니다.`);
    return false;
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`✅ ${envVar}: ${value.substring(0, 20)}...`);
  }
  
  return true;
}

/**
 * HTTPS URL 검증 함수
 * @param {string} url - 검증할 URL
 * @returns {boolean} - HTTPS 여부
 */
export function validateHttpsUrl(url) {
  if (!url.startsWith('https://')) {
    console.error(`❌ HTTPS URL이 필요합니다: ${url}`);
    console.log('💡 해결 방법:');
    console.log('1. ngrok 설치: npm install -g ngrok');
    console.log('2. ngrok 실행: ngrok http 3000');
    console.log('3. 제공받은 HTTPS URL을 NEXT_PUBLIC_APP_URL에 설정');
    return false;
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`✅ HTTPS URL 확인: ${url}`);
  }
  
  return true;
}

/**
 * Instagram OAuth 관련 로그 출력
 * @param {Object} data - 로그 데이터
 */
export function logInstagramOAuth(data) {
  if (process.env.NODE_ENV !== 'development') return;
  
  console.log('🔐 Instagram OAuth 정보:');
  console.log('  Client ID:', data.clientId?.substring(0, 8) + '...');
  console.log('  Redirect URI:', data.redirectUri);
  console.log('  Scope:', data.scope);
  console.log('  Auth URL:', data.authUrl?.substring(0, 50) + '...');
}

/**
 * 토큰 교환 결과 로그 출력
 * @param {Object} tokenData - 토큰 데이터
 */
export function logTokenExchange(tokenData) {
  if (process.env.NODE_ENV !== 'development') return;
  
  console.log('🎯 토큰 교환 결과:');
  console.log('  Access Token:', tokenData.access_token ? '✅ 수신됨' : '❌ 없음');
  console.log('  User ID:', tokenData.user_id || '❌ 없음');
  console.log('  Token Type:', tokenData.token_type || '❌ 없음');
}

/**
 * 환경 설정 상태 체크
 */
export function checkEnvironmentSetup() {
  if (process.env.NODE_ENV !== 'development') return;
  
  console.log('🔍 환경 설정 체크:');
  console.log('  Node 환경:', process.env.NODE_ENV);
  console.log('  App URL:', process.env.NEXT_PUBLIC_APP_URL || '❌ 설정되지 않음');
  console.log('  Instagram Client ID:', process.env.INSTAGRAM_CLIENT_ID ? '✅ 설정됨' : '❌ 설정되지 않음');
  console.log('  Instagram Client Secret:', process.env.INSTAGRAM_CLIENT_SECRET ? '✅ 설정됨' : '❌ 설정되지 않음');
  console.log('  Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ 설정됨' : '❌ 설정되지 않음');
} 