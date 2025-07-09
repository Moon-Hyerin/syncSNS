import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 게시글 생성 API
export async function POST(request) {
  try {
    const { 
      content, 
      images, 
      selectedPlatforms,
      publishType = 'immediate',
      scheduledAt = null
    } = await request.json();

    // 필수 데이터 검증
    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: '게시글 내용이 필요합니다.' },
        { status: 400 }
      );
    }

    if (!selectedPlatforms || selectedPlatforms.length === 0) {
      return NextResponse.json(
        { error: '발행할 플랫폼을 선택해주세요.' },
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

    // Supabase 클라이언트 생성
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

    // 사용자의 플랫폼 연동 상태 확인
    const { data: connections, error: connectionsError } = await supabase
      .from('social_connections')
      .select('platform')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .in('platform', selectedPlatforms);

    if (connectionsError) {
      console.error('플랫폼 연동 상태 확인 실패:', connectionsError);
      return NextResponse.json(
        { error: '플랫폼 연동 상태 확인에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 연동되지 않은 플랫폼 확인
    const connectedPlatforms = connections.map(conn => conn.platform);
    const disconnectedPlatforms = selectedPlatforms.filter(platform => 
      !connectedPlatforms.includes(platform)
    );

    if (disconnectedPlatforms.length > 0) {
      return NextResponse.json(
        { error: `${disconnectedPlatforms.join(', ')} 플랫폼이 연동되어 있지 않습니다.` },
        { status: 400 }
      );
    }

    // 게시글 데이터 구성
    const postData = {
      user_id: user.id,
      content: content.trim(),
      images: images || [],
      publish_type: publishType,
      scheduled_at: scheduledAt,
      status: publishType === 'immediate' ? 'draft' : 'scheduled'
    };

    // 게시글 생성
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert(postData)
      .select()
      .single();

    if (postError) {
      console.error('게시글 생성 실패:', postError);
      return NextResponse.json(
        { error: '게시글 생성에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 플랫폼별 발행 상태 레코드 생성
    const platformRecords = selectedPlatforms.map(platform => ({
      post_id: post.id,
      platform: platform,
      status: 'pending',
      retry_count: 0,
      max_retries: 3
    }));

    const { error: platformError } = await supabase
      .from('post_platforms')
      .insert(platformRecords);

    if (platformError) {
      console.error('플랫폼별 발행 상태 생성 실패:', platformError);
      // 게시글은 이미 생성되었으므로 롤백하지 않고 계속 진행
    }

    console.log('게시글 생성 성공:', {
      postId: post.id,
      userId: user.id,
      platforms: selectedPlatforms,
      publishType: publishType
    });

    return NextResponse.json({
      success: true,
      post: {
        id: post.id,
        content: post.content,
        images: post.images,
        publishType: post.publish_type,
        scheduledAt: post.scheduled_at,
        status: post.status,
        createdAt: post.created_at
      },
      platforms: selectedPlatforms,
      message: '게시글이 성공적으로 생성되었습니다.'
    });

  } catch (error) {
    console.error('게시글 생성 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 사용자의 게시글 목록 조회 API
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status'); // 특정 상태만 조회

    // Authorization 헤더에서 토큰 가져오기
    const authorization = request.headers.get('authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '인증 토큰이 필요합니다.' },
        { status: 401 }
      );
    }

    const token = authorization.split(' ')[1];

    // Supabase 클라이언트 생성
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

    // 게시글 조회 쿼리 구성
    let query = supabase
      .from('posts')
      .select(`
        id,
        content,
        images,
        publish_type,
        scheduled_at,
        status,
        created_at,
        updated_at,
        published_at,
        post_platforms (
          id,
          platform,
          status,
          platform_post_id,
          error_message,
          published_at,
          retry_count
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // 특정 상태만 조회하는 경우
    if (status) {
      query = query.eq('status', status);
    }

    // 페이지네이션 적용
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: posts, error: postsError } = await query;

    if (postsError) {
      console.error('게시글 조회 실패:', postsError);
      return NextResponse.json(
        { error: '게시글 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 전체 게시글 수 조회
    let countQuery = supabase
      .from('posts')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id);

    if (status) {
      countQuery = countQuery.eq('status', status);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('게시글 수 조회 실패:', countError);
    }

    return NextResponse.json({
      success: true,
      posts: posts || [],
      pagination: {
        page: page,
        limit: limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('게시글 조회 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 