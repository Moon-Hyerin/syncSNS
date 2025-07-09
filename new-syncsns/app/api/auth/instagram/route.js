import { NextResponse } from 'next/server';
import { validateEnvVar, validateHttpsUrl, logInstagramOAuth } from '../../../../lib/debugUtils';

export async function GET() {
  try {
    // Instagram OAuth URL 생성을 위한 환경변수 가져오기
    const clientId = process.env.INSTAGRAM_CLIENT_ID;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const scope = 'instagram_business_basic,instagram_business_content_publish,instagram_business_manage_comments';
    
    // 환경변수 검증
    if (!validateEnvVar('INSTAGRAM_CLIENT_ID', clientId)) {
      return NextResponse.json(
        { error: 'Instagram 클라이언트 ID가 설정되지 않았습니다. 환경변수를 확인해주세요.' },
        { status: 500 }
      );
    }

    if (!validateEnvVar('NEXT_PUBLIC_APP_URL', appUrl)) {
      return NextResponse.json(
        { error: 'APP URL이 설정되지 않았습니다. 환경변수를 확인해주세요.' },
        { status: 500 }
      );
    }

    // HTTPS 여부 확인 (Instagram OAuth 필수 조건)
    if (!validateHttpsUrl(appUrl)) {
      return NextResponse.json(
        { error: 'Instagram OAuth는 HTTPS URL이 필요합니다. ngrok 등을 사용해 HTTPS를 설정해주세요.' },
        { status: 500 }
      );
    }

    const redirectUri = `${appUrl}/api/auth/instagram/callback`;
    
    // Instagram OAuth URL 생성
    const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code`;
    
    // 개발 환경에서 디버깅 로그
    logInstagramOAuth({
      clientId,
      redirectUri,
      scope,
      authUrl
    });
    
    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Instagram OAuth URL 생성 오류:', error);
    return NextResponse.json(
      { error: 'Instagram 연동 설정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 