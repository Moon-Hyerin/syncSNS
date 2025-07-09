import { NextResponse } from 'next/server';
import { getKoreanTimeWithOffset } from '@/lib/dateUtils';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
  console.log('🚀 Instagram OAuth 콜백 요청 시작...');
  
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  console.log('📋 수신된 파라미터:', { 
    hasCode: !!code,
    hasError: !!error,
    state: state || 'none'
  });

  // APP URL 환경변수 확인
  if (!appUrl) {
    console.error('❌ NEXT_PUBLIC_APP_URL이 설정되지 않았습니다.');
    return NextResponse.json(
      { error: 'APP URL이 설정되지 않았습니다.' },
      { status: 500 }
    );
  }

  // Instagram에서 오류가 발생한 경우
  if (error) {
    console.error('❌ Instagram OAuth 오류:', error);
    console.log('🔄 클라이언트에 오류 메시지 전달 중...');
    
    return new NextResponse(
      `
      <html>
        <head><title>Instagram 연동 오류</title></head>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'INSTAGRAM_AUTH_ERROR',
                error: '${error === 'access_denied' ? '사용자가 Instagram 연동을 거부했습니다.' : 'Instagram 연동 중 오류가 발생했습니다.'}'
              }, '*');
              window.close();
            } else {
              window.location.href = '${appUrl}/connections/instagram?error=${error}';
            }
          </script>
        </body>
      </html>
      `,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  // 인증 코드가 없는 경우
  if (!code) {
    console.error('❌ Instagram OAuth 인증 코드가 없습니다.');
    console.log('📋 URL 파라미터:', { code, error, state });
    console.log('🔄 클라이언트에 오류 메시지 전달 중...');
    
    return new NextResponse(
      `
      <html>
        <head><title>Instagram 연동 오류</title></head>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'INSTAGRAM_AUTH_ERROR',
                error: 'Instagram에서 인증 코드를 받지 못했습니다.'
              }, '*');
              window.close();
            } else {
              window.location.href = '${appUrl}/connections/instagram?error=no_code';
            }
          </script>
        </body>
      </html>
      `,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  try {
    console.log('🔄 Instagram 토큰 교환 프로세스 시작...');
    
    // Instagram 액세스 토큰 교환
    const clientId = process.env.INSTAGRAM_CLIENT_ID;
    const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      console.error('❌ Instagram 클라이언트 정보가 설정되지 않음');
      throw new Error('Instagram 클라이언트 정보가 설정되지 않았습니다.');
    }

    console.log('📝 1단계: 단기 토큰 교환 요청 시작...');
    const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: `${appUrl}/api/auth/instagram/callback`,
        code: code,
      }),
    });

    console.log('📋 단기 토큰 교환 API 응답 상태:', tokenResponse.status);
    
    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
      console.error('❌ 단기 토큰 교환 실패:', tokenData.error_description || tokenData.error);
      throw new Error(tokenData.error_description || '토큰 교환 실패');
    }

    // 단기 토큰 만료일 계산 (현재 한국 시간 + 1시간)
    const shortTokenExpiresAt = getKoreanTimeWithOffset(60 * 60 * 1000);
    
    console.log('✅ 1단계 완료: 단기 토큰 교환 성공');
    console.log('📊 단기 토큰 정보:', {
      user_id: tokenData.user_id || 'ID 없음',
      token_length: tokenData.access_token ? tokenData.access_token.length : 0,
      expires_at: shortTokenExpiresAt
    });

    // 장기 토큰으로 교환 시도
    let finalTokenData = {
      access_token: tokenData.access_token,
      token_type: tokenData.token_type || 'bearer',
      expires_at: shortTokenExpiresAt
    };

    try {
      console.log('🔄 2단계: 장기 토큰 교환 시도 시작...');
      
      // 장기 토큰 교환 API 호출
      const longTokenUrl = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${clientSecret}&access_token=${tokenData.access_token}`;
      
      console.log('📝 장기 토큰 교환 API 요청 중...');
      const longTokenResponse = await fetch(longTokenUrl, {
        method: 'GET',
      });

      console.log('📋 장기 토큰 교환 API 응답 상태:', longTokenResponse.status);
      const longTokenData = await longTokenResponse.json();
      
      if (longTokenData.error) {
        console.warn('⚠️ 장기 토큰 교환 실패:', longTokenData.error);
        console.log('📌 단기 토큰으로 계속 진행합니다');
      } else {
        // 장기 토큰 교환 성공
        const longTokenExpiresAt = getKoreanTimeWithOffset(longTokenData.expires_in * 1000);
        
        finalTokenData = {
          access_token: longTokenData.access_token,
          token_type: longTokenData.token_type || 'bearer',
          expires_at: longTokenExpiresAt
        };
        
        console.log('✅ 2단계 완료: 장기 토큰 교환 성공!');
        console.log('📊 장기 토큰 정보:', {
          expires_in_seconds: longTokenData.expires_in,
          expires_in_days: Math.floor(longTokenData.expires_in / (24 * 60 * 60)),
          expires_at: longTokenExpiresAt,
          token_length: longTokenData.access_token ? longTokenData.access_token.length : 0
        });
      }
    } catch (longTokenError) {
      console.warn('❌ 장기 토큰 교환 중 오류 발생:', longTokenError.message);
      console.log('📌 단기 토큰으로 계속 진행합니다');
    }
    
    // Instagram 사용자 정보 가져오기 (최종 토큰 사용)
    console.log('🔄 3단계: 사용자 정보 조회 시작...');
    let userInfo = {};
    try {
      // 기본 계정 정보 가져오기
      console.log('📝 기본 계정 정보 조회 중...');
      const userResponse = await fetch(`https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${finalTokenData.access_token}`);
      const userData = await userResponse.json();
      
      if (userData.error) {
        console.error('❌ Instagram 사용자 정보 가져오기 실패:', userData.error);
        throw new Error('사용자 정보를 가져올 수 없습니다.');
      }

      console.log('📋 기본 계정 정보 조회 성공:', {
        id: userData.id,
        username: userData.username,
        account_type: userData.account_type,
        media_count: userData.media_count
      });

      // 팔로워 수와 프로필 사진 가져오기 (Instagram Business API)
      let followersCount = 0;
      let profilePictureUrl = '';
      
      try {
        // Instagram Business Account인 경우 팔로워 수 가져오기
        if (userData.account_type === 'BUSINESS') {
          console.log('📝 비즈니스 계정 인사이트 정보 조회 중...');
          const insightsResponse = await fetch(`https://graph.facebook.com/v18.0/${userData.id}?fields=followers_count,profile_picture_url&access_token=${finalTokenData.access_token}`);
          const insightsData = await insightsResponse.json();
          
          if (!insightsData.error) {
            followersCount = insightsData.followers_count || 0;
            profilePictureUrl = insightsData.profile_picture_url || '';
            console.log('📋 비즈니스 계정 인사이트 조회 성공:', {
              followers_count: followersCount,
              has_profile_picture: !!profilePictureUrl
            });
          } else {
            console.warn('⚠️ 비즈니스 계정 인사이트 조회 실패:', insightsData.error);
          }
        } else {
          console.log('📋 개인 계정 - 인사이트 정보 건너뛰기');
        }
        
        // 프로필 사진이 없는 경우 기본 이미지 설정
        if (!profilePictureUrl) {
          profilePictureUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.username)}&background=e11d48&color=fff&size=150`;
          console.log('📸 기본 프로필 사진 설정 완료');
        }
      } catch (insightsError) {
        console.warn('❌ Instagram 인사이트 정보 가져오기 실패:', insightsError.message);
        // 기본값 설정
        profilePictureUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.username)}&background=e11d48&color=fff&size=150`;
        console.log('📸 기본 프로필 사진으로 대체 설정 완료');
      }

      userInfo = {
        id: userData.id,
        username: userData.username,
        account_type: userData.account_type,
        media_count: userData.media_count || 0,
        followers_count: followersCount,
        profile_picture_url: profilePictureUrl
      };

      console.log('✅ 3단계 완료: 사용자 정보 조회 성공!');
      console.log('📊 최종 사용자 정보:', {
        username: userInfo.username,
        account_type: userInfo.account_type,
        media_count: userInfo.media_count,
        followers_count: userInfo.followers_count
      });
      
    } catch (error) {
      console.error('❌ Instagram 사용자 정보 가져오기 오류:', error.message);
      console.log('📌 최소한의 사용자 정보로 대체 설정 중...');
      
      // 최소한의 정보라도 제공
      userInfo = {
        id: tokenData.user_id,
        username: 'unknown_user',
        account_type: 'PERSONAL',
        media_count: 0,
        followers_count: 0,
        profile_picture_url: 'https://ui-avatars.com/api/?name=Unknown&background=gray&color=fff&size=150'
      };
      
      console.log('📋 대체 사용자 정보 설정 완료');
    }
    
    // Instagram 연동 정보는 클라이언트 사이드에서 저장하도록 변경
    // 서버 사이드에서 사용자 세션 정보를 가져오는 것은 팝업 환경에서 제한적임
    console.log('🔄 4단계: 클라이언트 데이터 전달 준비...');
    console.log('✅ Instagram OAuth 프로세스 완료 - 클라이언트로 결과 전달 중...');
    
    return new NextResponse(
      `
      <html>
        <head><title>Instagram 연동 성공</title></head>
        <body>
          <script>
            if (window.opener) {
              try {
                // 최종 토큰 정보를 클라이언트에 전달
                const tokenDataForClient = {
                  access_token: '${finalTokenData.access_token}',
                  token_type: '${finalTokenData.token_type}',
                  expires_at: '${finalTokenData.expires_at}'
                };
                
                window.opener.postMessage({
                  type: 'INSTAGRAM_AUTH_SUCCESS',
                  account: ${JSON.stringify(userInfo)},
                  tokenData: tokenDataForClient
                }, '*');
                console.log('메시지 전송 완료:', 'INSTAGRAM_AUTH_SUCCESS');
                window.close();
              } catch (error) {
                console.error('메시지 전송 오류:', error);
                window.opener.postMessage({
                  type: 'INSTAGRAM_AUTH_ERROR',
                  error: '데이터 전송 중 오류가 발생했습니다.'
                }, '*');
                window.close();
              }
            } else {
              window.location.href = '${appUrl}/connections/instagram?success=true';
            }
          </script>
        </body>
      </html>
      `,
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (error) {
    console.error('❌ Instagram 콜백 처리 중 치명적 오류 발생:', error.message);
    console.error('🔍 오류 상세:', error.stack);
    console.log('🔄 클라이언트에 오류 메시지 전달 중...');
    
    return new NextResponse(
      `
      <html>
        <head><title>Instagram 연동 오류</title></head>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'INSTAGRAM_AUTH_ERROR',
                error: 'Instagram 토큰 교환에 실패했습니다.'
              }, '*');
              window.close();
            } else {
              window.location.href = '${appUrl}/connections/instagram?error=token_exchange_failed';
            }
          </script>
        </body>
      </html>
      `,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
} 