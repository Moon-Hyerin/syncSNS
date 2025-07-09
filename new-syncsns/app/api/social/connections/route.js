import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getKoreanTimeISO } from '@/lib/dateUtils';

// SNS 연동 정보 저장 (POST)
export async function POST(request) {
  try {
    const { 
      userId, 
      platform, 
      platformUserInfo, 
      tokenData 
    } = await request.json();

    // 필수 데이터 검증
    if (!userId || !platform || !platformUserInfo || !tokenData) {
      return NextResponse.json(
        { error: '필수 데이터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // Authorization 헤더에서 토큰 가져오기
    const authorization = request.headers.get('authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '인증 토큰이 필요합니다.' },
        { status: 401 }
      );
    }

    const token = authorization.split(' ')[1];

    // Supabase 클라이언트 생성 (토큰 포함)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // 현재 로그인한 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      );
    }

    // 요청한 userId와 실제 로그인한 사용자 ID가 일치하는지 확인
    if (user.id !== userId) {
      return NextResponse.json(
        { error: '자신의 계정만 연동할 수 있습니다.' },
        { status: 403 }
      );
    }

    // 기존 연동 정보 확인 (같은 platform_user_id가 이미 연동되어 있는지)
    const { data: existingConnection } = await supabase
      .from('social_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', platform)
      .eq('platform_user_id', platformUserInfo.id)
      .eq('is_active', true)
      .single();

    // 연동 정보 데이터 구성
    const connectionData = {
      user_id: userId,
      platform: platform,
      platform_user_id: platformUserInfo.id,
      username: platformUserInfo.username,
      display_name: platformUserInfo.display_name || platformUserInfo.username,
      profile_picture_url: platformUserInfo.profile_picture_url,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      token_type: tokenData.token_type || 'bearer',
      token_expires_at: tokenData.expires_at || null,
      connected_at: getKoreanTimeISO(),
      is_active: true
    };

    let result;
    if (existingConnection) {
      // 기존 연동 정보 업데이트
      result = await supabase
        .from('social_connections')
        .update(connectionData)
        .eq('id', existingConnection.id)
        .select()
        .single();
      
      console.log(`${platform} 연동 정보 업데이트 완료:`, platformUserInfo.username);
    } else {
      // 새로운 연동 정보 생성
      result = await supabase
        .from('social_connections')
        .insert(connectionData)
        .select()
        .single();
      
      console.log(`${platform} 연동 정보 생성 완료:`, platformUserInfo.username);
    }

    if (result.error) {
      console.error('SNS 연동 정보 저장 실패:', result.error);
      return NextResponse.json(
        { error: '연동 정보 저장에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 민감한 정보 제외하고 응답
    const safeConnection = {
      id: result.data.id,
      platform: result.data.platform,
      platform_user_id: result.data.platform_user_id,
      username: result.data.username,
      display_name: result.data.display_name,
      profile_picture_url: result.data.profile_picture_url,
      connected_at: result.data.connected_at,
      is_active: result.data.is_active
    };

    return NextResponse.json({
      success: true,
      connection: safeConnection
    });

  } catch (error) {
    console.error('SNS 연동 정보 저장 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 사용자의 SNS 연동 목록 조회 (GET)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const platform = searchParams.get('platform'); // 특정 플랫폼만 조회 (선택사항)

    if (!userId) {
      return NextResponse.json(
        { error: '사용자 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // Authorization 헤더에서 토큰 가져오기
    const authorization = request.headers.get('authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '인증 토큰이 필요합니다.' },
        { status: 401 }
      );
    }

    const token = authorization.split(' ')[1];

    // Supabase 클라이언트 생성 (토큰 포함)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // 현재 로그인한 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      );
    }

    // 요청한 userId와 실제 로그인한 사용자 ID가 일치하는지 확인
    if (user.id !== userId) {
      return NextResponse.json(
        { error: '자신의 계정만 조회할 수 있습니다.' },
        { status: 403 }
      );
    }

    // 연동 정보 조회 쿼리
    let query = supabase
      .from('social_connections')
      .select('id, platform, platform_user_id, username, display_name, profile_picture_url, connected_at, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('connected_at', { ascending: false });

    // 특정 플랫폼만 조회하는 경우
    if (platform) {
      query = query.eq('platform', platform);
    }

    const { data: connections, error } = await query;

    if (error) {
      console.error('SNS 연동 정보 조회 실패:', error);
      return NextResponse.json(
        { error: '연동 정보 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 플랫폼별로 그룹화
    const groupedConnections = connections.reduce((acc, connection) => {
      if (!acc[connection.platform]) {
        acc[connection.platform] = [];
      }
      acc[connection.platform].push(connection);
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      connections: connections,
      groupedConnections: groupedConnections,
      totalCount: connections.length
    });

  } catch (error) {
    console.error('SNS 연동 상태 확인 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 