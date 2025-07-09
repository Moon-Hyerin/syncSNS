import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getKoreanTimeISO } from '@/lib/dateUtils';

// 특정 SNS 연동 해제 (DELETE)
export async function DELETE(request, { params }) {
  try {
    // params에서 id 추출
    const { id } = await params;
    
    console.log('DELETE 요청 수신 - ID:', id);

    if (!id) {
      console.log('연동 ID 누락');
      return NextResponse.json(
        { error: '연동 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // Authorization 헤더에서 토큰 추출
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    
    // Supabase 세션에서 사용자 정보 추출
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Supabase 세션에서 사용자 정보 가져오기 실패:', userError);
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const userId = user.id;
    console.log('Supabase 세션에서 추출한 User ID:', userId);

    // 토큰을 사용하여 Supabase 클라이언트 생성 (RLS 정책 통과용)
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseWithAuth = createClient(
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

    // 연동 정보 조회 (권한 확인) - 토큰 인증된 클라이언트 사용
    const { data: connection, error: fetchError } = await supabaseWithAuth
      .from('social_connections')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (fetchError) {
      console.error('연동 정보 조회 오류:', fetchError);
      return NextResponse.json(
        { error: '연동 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (!connection) {
      console.log('연동 정보 없음');
      return NextResponse.json(
        { error: '연동 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 연동 정보를 비활성화 (완전 삭제하지 않고 is_active를 false로 설정)
    const { error: deleteError } = await supabaseWithAuth
      .from('social_connections')
      .update({ 
        is_active: false, 
        disconnected_at: getKoreanTimeISO() 
      })
      .eq('id', id)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('SNS 연동 해제 실패:', deleteError);
      return NextResponse.json(
        { error: '연동 해제에 실패했습니다.' },
        { status: 500 }
      );
    }

    console.log(`${connection.platform} 연동 해제 완료:`, connection.username);

    return NextResponse.json({
      success: true,
      message: `${connection.platform} 연동이 해제되었습니다.`,
      disconnectedConnection: {
        id: connection.id,
        platform: connection.platform,
        username: connection.username
      }
    });

  } catch (error) {
    console.error('SNS 연동 해제 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 특정 SNS 연동 정보 조회 (GET)
export async function GET(request, { params }) {
  try {
    // params에서 id 추출
    const { id } = await params;

    console.log('GET 요청 수신 - ID:', id);

    if (!id) {
      console.log('연동 ID 누락');
      return NextResponse.json(
        { error: '연동 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // Authorization 헤더에서 토큰 추출
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    
    // Supabase 세션에서 사용자 정보 추출
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Supabase 세션에서 사용자 정보 가져오기 실패:', userError);
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const userId = user.id;
    console.log('Supabase 세션에서 추출한 User ID:', userId);

    // 토큰을 사용하여 Supabase 클라이언트 생성 (RLS 정책 통과용)
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseWithAuth = createClient(
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

    // 연동 정보 조회 - 토큰 인증된 클라이언트 사용
    const { data: connection, error } = await supabaseWithAuth
      .from('social_connections')
      .select('id, platform, platform_user_id, username, display_name, profile_picture_url, connected_at, is_active')
      .eq('id', id)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error || !connection) {
      return NextResponse.json(
        { error: '연동 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      connection: connection
    });

  } catch (error) {
    console.error('SNS 연동 정보 조회 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 