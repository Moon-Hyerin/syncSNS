import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getKoreanTimeISO } from '@/lib/dateUtils';

// Instagram 토큰 검증 함수
async function validateInstagramToken(access_token) {
  try {
    console.log('Instagram 토큰 검증 시작...');
    const response = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${access_token}`);
    const data = await response.json();
    
    if (data.error) {
      console.error('Instagram 토큰 검증 실패:', data.error);
      return { valid: false, error: data.error.message };
    }
    
    console.log('Instagram 토큰 검증 성공:', { user_id: data.id, username: data.username });
    return { valid: true, userInfo: data };
  } catch (error) {
    console.error('Instagram 토큰 검증 오류:', error);
    return { valid: false, error: error.message };
  }
}

// Instagram 게시글 발행 함수
async function publishToInstagram(postData, connectionData) {
  try {
    const { content, images } = postData;
    const { access_token } = connectionData;

    console.log('Instagram 발행 시작:', {
      content: content?.substring(0, 50) + '...',
      imageCount: images?.length || 0,
      hasToken: !!access_token,
      tokenLength: access_token?.length || 0
    });

    // 토큰 검증 먼저 수행 (Instagram ID 가져오기)
    const tokenValidation = await validateInstagramToken(access_token);
    if (!tokenValidation.valid) {
      throw new Error(`Instagram 토큰이 유효하지 않습니다: ${tokenValidation.error}`);
    }

    const igId = tokenValidation.userInfo.id;
    console.log('Instagram ID 확인:', igId);

    // Instagram Graph API를 사용한 게시글 발행
    // 1. 이미지가 있는 경우 미디어 업로드
    if (images && images.length > 0) {
      if (images.length === 1) {
        // 단일 이미지 게시글
        const imageUrl = images[0].publicUrl || images[0];
        console.log('단일 이미지 발행 시도:', imageUrl);
        
        // 미디어 컨테이너 생성 (문서 기준)
        const mediaResponse = await fetch(`https://graph.instagram.com/v18.0/${igId}/media`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${access_token}`
          },
          body: JSON.stringify({
            image_url: imageUrl,
            caption: content
          })
        });

        const mediaData = await mediaResponse.json();
        
        if (mediaData.error) {
          throw new Error(`Instagram 미디어 생성 실패: ${mediaData.error.message}`);
        }

        console.log('미디어 컨테이너 생성 성공:', mediaData.id);

        // 미디어 발행 (문서 기준)
        const publishResponse = await fetch(`https://graph.instagram.com/v18.0/${igId}/media_publish`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${access_token}`
          },
          body: JSON.stringify({
            creation_id: mediaData.id
          })
        });

        const publishData = await publishResponse.json();
        
        if (publishData.error) {
          throw new Error(`Instagram 발행 실패: ${publishData.error.message}`);
        }

        console.log('Instagram 발행 성공:', publishData.id);

        return {
          success: true,
          platformPostId: publishData.id,
          message: 'Instagram에 성공적으로 발행되었습니다.'
        };

      } else {
        // 다중 이미지 게시글 (캐러셀) - 문서 기준
        const mediaIds = [];
        
        // 각 이미지를 미디어 컨테이너로 생성
        for (const image of images) {
          const imageUrl = image.publicUrl || image;
          
          const mediaResponse = await fetch(`https://graph.instagram.com/v18.0/${igId}/media`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${access_token}`
            },
            body: JSON.stringify({
              image_url: imageUrl,
              is_carousel_item: true
            })
          });

          const mediaData = await mediaResponse.json();
          
          if (mediaData.error) {
            throw new Error(`Instagram 미디어 생성 실패: ${mediaData.error.message}`);
          }

          mediaIds.push(mediaData.id);
        }

        // 캐러셀 컨테이너 생성 (문서 기준)
        const carouselResponse = await fetch(`https://graph.instagram.com/v18.0/${igId}/media`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${access_token}`
          },
          body: JSON.stringify({
            media_type: 'CAROUSEL',
            children: mediaIds.join(','),
            caption: content
          })
        });

        const carouselData = await carouselResponse.json();
        
        if (carouselData.error) {
          throw new Error(`Instagram 캐러셀 생성 실패: ${carouselData.error.message}`);
        }

        // 캐러셀 발행
        const publishResponse = await fetch(`https://graph.instagram.com/v18.0/${igId}/media_publish`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${access_token}`
          },
          body: JSON.stringify({
            creation_id: carouselData.id
          })
        });

        const publishData = await publishResponse.json();
        
        if (publishData.error) {
          throw new Error(`Instagram 발행 실패: ${publishData.error.message}`);
        }

        return {
          success: true,
          platformPostId: publishData.id,
          message: 'Instagram에 성공적으로 발행되었습니다.'
        };
      }
    } else {
      // 텍스트만 있는 경우 (Instagram은 이미지 필수이므로 에러)
      throw new Error('Instagram은 이미지가 필수입니다.');
    }

  } catch (error) {
    console.error('Instagram 발행 오류:', error);
    return {
      success: false,
      error: error.message || 'Instagram 발행 중 오류가 발생했습니다.'
    };
  }
}

// Twitter 게시글 발행 함수 (현재는 모의 구현)
async function publishToTwitter(postData, connectionData) {
  try {
    // Twitter API v2를 사용한 트윗 발행
    // 실제 구현 시 twitter-api-v2 라이브러리 사용 권장
    
    console.log('Twitter 발행 시뮬레이션:', {
      content: postData.content,
      images: postData.images?.length || 0
    });

    // 임시로 성공 응답 반환 (실제 구현 필요)
    return {
      success: true,
      platformPostId: `twitter_${Date.now()}`,
      message: 'Twitter에 성공적으로 발행되었습니다. (모의 구현)'
    };

  } catch (error) {
    console.error('Twitter 발행 오류:', error);
    return {
      success: false,
      error: error.message || 'Twitter 발행 중 오류가 발생했습니다.'
    };
  }
}

// 특정 게시글을 플랫폼별로 발행하는 API
export async function POST(request, { params }) {
  try {
    const { id: postId } = await params;
    console.log('게시글 발행 API 호출됨:', postId);

    if (!postId) {
      return NextResponse.json(
        { error: '게시글 ID가 필요합니다.' },
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
      console.log('사용자 인증 실패:', authError);
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      );
    }

    console.log('사용자 인증 성공:', user.id);

    // 게시글 정보 조회
    console.log('게시글 정보 조회 시도:', postId);
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select(`
        id,
        user_id,
        content,
        images,
        status,
        post_platforms (
          id,
          platform,
          status,
          retry_count,
          max_retries
        )
      `)
      .eq('id', postId)
      .eq('user_id', user.id)
      .single();

    if (postError || !post) {
      console.log('게시글 조회 실패:', postError);
      return NextResponse.json(
        { error: '게시글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    console.log('게시글 조회 성공:', {
      id: post.id,
      platformsCount: post.post_platforms?.length || 0,
      status: post.status
    });

    // 발행 가능한 플랫폼 확인 (pending 상태이고 재시도 횟수가 남은 것들)
    const pendingPlatforms = post.post_platforms.filter(pp => 
      pp.status === 'pending' && pp.retry_count < pp.max_retries
    );

    if (pendingPlatforms.length === 0) {
      return NextResponse.json(
        { error: '발행할 수 있는 플랫폼이 없습니다.' },
        { status: 400 }
      );
    }

    // 사용자의 플랫폼 연동 정보 조회
    const platformNames = pendingPlatforms.map(pp => pp.platform);
    console.log('플랫폼 연동 정보 조회 시도:', platformNames);
    
    const { data: connections, error: connectionsError } = await supabase
      .from('social_connections')
      .select('platform, access_token, refresh_token, token_type')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .in('platform', platformNames);

    if (connectionsError) {
      console.error('플랫폼 연동 정보 조회 실패:', connectionsError);
      return NextResponse.json(
        { error: '플랫폼 연동 정보 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    console.log('플랫폼 연동 정보 조회 성공:', {
      requestedPlatforms: platformNames,
      connectedPlatforms: connections.map(c => c.platform),
      connectionCount: connections.length
    });

    // 발행 결과 저장
    const publishResults = [];
    
    // 각 플랫폼별로 발행 시도
    for (const platformRecord of pendingPlatforms) {
      console.log('플랫폼별 발행 시도:', platformRecord.platform);
      const connection = connections.find(conn => conn.platform === platformRecord.platform);
      
      if (!connection) {
        // 연동 정보가 없는 경우
        console.log('연동 정보 없음:', platformRecord.platform);
        await supabase
          .from('post_platforms')
          .update({
            status: 'failed',
            error_message: '플랫폼 연동 정보를 찾을 수 없습니다.',
            retry_count: platformRecord.retry_count + 1
          })
          .eq('id', platformRecord.id);

        publishResults.push({
          platform: platformRecord.platform,
          success: false,
          error: '플랫폼 연동 정보를 찾을 수 없습니다.'
        });
        continue;
      }

      let publishResult;
      
      // 플랫폼별 발행 함수 호출
      console.log('플랫폼별 발행 함수 호출:', platformRecord.platform);
      switch (platformRecord.platform) {
        case 'instagram':
          publishResult = await publishToInstagram(post, connection);
          break;
        case 'twitter':
          publishResult = await publishToTwitter(post, connection);
          break;
        default:
          publishResult = {
            success: false,
            error: '지원하지 않는 플랫폼입니다.'
          };
      }
      
      console.log('플랫폼별 발행 결과:', {
        platform: platformRecord.platform,
        success: publishResult.success,
        error: publishResult.error
      });

      // 발행 결과에 따라 데이터베이스 업데이트
      if (publishResult.success) {
        await supabase
          .from('post_platforms')
          .update({
            status: 'published',
            platform_post_id: publishResult.platformPostId,
            published_at: getKoreanTimeISO(),
            error_message: null
          })
          .eq('id', platformRecord.id);
      } else {
        await supabase
          .from('post_platforms')
          .update({
            status: platformRecord.retry_count + 1 >= platformRecord.max_retries ? 'failed' : 'pending',
            error_message: publishResult.error,
            retry_count: platformRecord.retry_count + 1
          })
          .eq('id', platformRecord.id);
      }

      publishResults.push({
        platform: platformRecord.platform,
        success: publishResult.success,
        error: publishResult.error,
        platformPostId: publishResult.platformPostId
      });
    }

    // 모든 플랫폼 발행이 완료되었는지 확인
    const allPublished = publishResults.every(result => result.success);
    const anyPublished = publishResults.some(result => result.success);

    // 게시글 상태 업데이트
    if (allPublished) {
      await supabase
        .from('posts')
        .update({
          status: 'published',
          published_at: getKoreanTimeISO()
        })
        .eq('id', postId);
    } else if (anyPublished) {
      // 일부만 성공한 경우 부분 발행 상태로 설정
      await supabase
        .from('posts')
        .update({
          status: 'published', // 하나라도 성공하면 published로 설정
          published_at: getKoreanTimeISO()
        })
        .eq('id', postId);
    }

    console.log('게시글 발행 완료:', {
      postId: postId,
      results: publishResults,
      allPublished: allPublished
    });

    return NextResponse.json({
      success: true,
      postId: postId,
      publishResults: publishResults,
      allPublished: allPublished,
      message: allPublished 
        ? '모든 플랫폼에 성공적으로 발행되었습니다.'
        : anyPublished 
        ? '일부 플랫폼에 발행되었습니다.'
        : '발행에 실패했습니다.'
    });

  } catch (error) {
    console.error('게시글 발행 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 